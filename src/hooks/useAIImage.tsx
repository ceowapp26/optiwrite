import React, { useState, useCallback, useRef } from "react";
import { useModelStore } from "@/stores/features/models/store";
import { useTranslation } from "react-i18next";
import { MessageInterface, ModelOption, WarningType } from "@/types/chat";
import { limitMessageTokens, updateTotalTokenUsed, updateTimeLimitTokenUsed } from '@/utils/aiUtils';
import { useGeneralContext } from "@/context/general-context-provider";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useToken } from "./use-token";

export type ChatContext = "general" | "selection" | "page" | "q&a";

const convertToMessageInterface = (
  role: string,
  command: string,
  content: string,
  context: ChatContext,
  model: ModelOption
): MessageInterface => ({
  role,
  command,
  content,
  context,
  model,
});

const determineAPIEndpoint = (option: string) => {
  const isGemini = option.includes("describe") || option.includes("extract");
  if (isGemini) {
    return { APIEndpoint: "/api/image_gemini", model: 'gemini' };
  } else {
    return { APIEndpoint: "/api/image_openai", model: 'openai' };
  }
};

interface AIImageProps {
  option?: string;
  prompt?: string;
  setIsLoading?: React.Dispatch<React.SetStateAction<boolean>>;
  setWarningType?: React.Dispatch<React.SetStateAction<WarningType>>;
  setShowWarning?: React.Dispatch<React.SetStateAction<boolean>>;
  setNextTimeUsage?: React.Dispatch<React.SetStateAction<string>>;
  setError?: React.Dispatch<React.SetStateAction<string>>;
  setResData?: React.Dispatch<React.SetStateAction<string>>;
}

export const useAIImage = ({
  option,
  prompt,
  setIsLoading,
  setShowWarning,
  setWarningType,
  setNextTimeUsage,
  setError,
  setResData,
}: AIImageProps = {}) => {
  const { t } = useTranslation('api');
  const AIConfig = useModelStore((state) => state.AIConfig);
  const countTotalTokens = useModelStore((state) => state.countTotalTokens);
  const inputModel = useModelStore((state) => state.inputModel);
  const inputContext = useModelStore((state) => state.inputContext);
  const { aiModel, inputType, outputType } = useGeneralContext();
  const { checkTokenUsage, updateTokenUsage } = useToken();
  const updateModel = useMutation(api.models.updateModel);
  const models = useQuery(api.models.getAllModels);

  const updateTokens = useCallback(async (promptMessage: MessageInterface, completionMessage: MessageInterface, inputModelData: any, imageInput?: any) => {
    await updateTotalTokenUsed({
      model: inputModel,
      promptMessages: [promptMessage],
      completionMessage,
      aiModel,
      inputType,
      outputType,
      inputImage: imageInput,
      inputModelData,
      updateModel,
    });
    await updateTimeLimitTokenUsed({
      model: inputModel,
      promptMessages: [promptMessage],
      completionMessage,
      aiModel,
      inputType,
      outputType,
      inputImage: imageInput,
      inputModelData,
      updateModel,
    });
    await updateTokenUsage();
  }, [updateTotalTokenUsed, updateTimeLimitTokenUsed, updateTokenUsage, inputModel, aiModel, inputType, outputType, updateModel]);

  const handleAIImage = useCallback(async () => {
    setIsLoading && setIsLoading(true);
    const inputModelData = models?.find(model => model.model === inputModel);
    if (!inputModelData) {
      console.error("Input model data not found");
      return; 
    }
    const { APIEndpoint, model } = determineAPIEndpoint(option);
    let requestOption = {
      prompt: prompt,
      command: option,
      model: inputModel,
      contextContent: '',
      config: {
        RPM: inputModelData.base_RPM + inputModelData.floor_RPM,
        RPD: inputModelData.base_RPD + inputModelData.floor_RPD,
        max_tokens: inputModelData.max_tokens,
      }
    };
    try {
      const isInsufficientTokens = checkTokenUsage();
      if (isInsufficientTokens) return; 

      const fetchAPI = async () => {
        const response = await fetch(APIEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestOption),
        });

        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch (e) {
            console.error("Error parsing JSON:", e);
            errorData = { error: "An unexpected error occurred", status: response.status };
          }
          setError(errorData.error);
          switch (response.status) {
            case 429:
              setShowWarning?.(true);
              setWarningType?.('CURRENT');
              setNextTimeUsage?.(errorData.nextAllowedTime);
              break;
            case 403:
              if (errorData.error === "Unsupported region") {
                setShowWarning?.(true);
                setWarningType?.('UNSUPPORTED');
              } else {
                toast.error(errorData.error);
              }
              break;
            default:
              toast.error(errorData.error);
          }
          throw new Error(await response.text());
        }
        const result = await response.json();
        return result;
      };

      if (model === "openai") {
        const promptMessage: MessageInterface = convertToMessageInterface("user", "", prompt, inputContext, inputModel);
        const messages = await limitMessageTokens([promptMessage], AIConfig[inputModel].max_tokens, inputModel, aiModel, inputType, outputType);
        if (messages.length === 0) {
          toast.error("Message exceeds max token!");
          return;
        }
        const result = await fetchAPI();
        setResData && setResData(result.response);
        if (countTotalTokens) {
          const completionMessage = convertToMessageInterface("assistant", "", result.response, inputContext, inputModel);
          await updateTokens(promptMessage, completionMessage, inputModelData);
        }
      } else if (model === "gemini") {
        const result = await fetchAPI();
        const { textInput, imageInput, response } = result;
        setResData && setResData(response);
        if (countTotalTokens) {
          const promptMessage = convertToMessageInterface("user", "", textInput, inputContext, inputModel);
          const completionMessage = convertToMessageInterface("assistant", "", response, inputContext, inputModel);
          await updateTokens(promptMessage, completionMessage, inputModelData, imageInput);
        }
      }
    } catch (e: unknown) {
      const err = (e as Error).message;
      console.error("Error in POST request:", err);
    } finally {
      setIsLoading && setIsLoading(false);
    }
  }, [
    option,
    prompt,
    setIsLoading,
    setShowWarning,
    setWarningType,
    setNextTimeUsage,
    setError,
    setResData,
    models,
    inputModel,
    AIConfig,
    aiModel,
    inputType,
    outputType,
    checkTokenUsage,
    countTotalTokens,
    determineAPIEndpoint,
    updateTokens,
    inputContext,
    limitMessageTokens,
  ]);

  return { handleAIImage }; 
};
