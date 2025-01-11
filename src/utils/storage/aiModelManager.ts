import { prisma } from '@/lib/prisma';
import { AIModel, ModelName, Prisma } from '@prisma/client';

type CreateModelInput = Omit<AIModel, 'id'>;
type UpdateModelInput = Partial<CreateModelInput>;

export class ModelError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'ModelError';
  }
}

export class ModelManager {
  private static instance: ModelManager;

  private constructor() {}

  public static getInstance(): ModelManager {
    if (!ModelManager.instance) {
      ModelManager.instance = new ModelManager();
    }
    return ModelManager.instance;
  }

  private static handlePrismaError(error: any): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          throw new ModelError('Model with this name already exists', 'DUPLICATE_NAME');
        case 'P2025':
          throw new ModelError('Model not found', 'NOT_FOUND');
        case 'P2000':
          throw new ModelError('Invalid input data', 'INVALID_INPUT');
        default:
          throw new ModelError(`Database error: ${error.code}`, 'DATABASE_ERROR');
      }
    }
    throw new ModelError('An unexpected error occurred', 'UNKNOWN_ERROR');
  }

  public static async createModel(modelData: CreateModelInput): Promise<AIModel> {
    try {
      return await prisma.aIModel.upsert({
        where: { name: modelData.name },
        create: {
          ...modelData,
          inputTokens: Number(modelData.inputTokens),
          outputTokens: Number(modelData.outputTokens),
          RPM: Number(modelData.RPM),
          RPD: Number(modelData.RPD),
          maxTokens: modelData.maxTokens ? Number(modelData.maxTokens) : 0,
          TPM: modelData.TPM ? Number(modelData.TPM) : 0,
          TPD: modelData.TPD ? Number(modelData.TPD) : 0,
        },
        update: {
          ...modelData,
          inputTokens: Number(modelData.inputTokens),
          outputTokens: Number(modelData.outputTokens),
          RPM: Number(modelData.RPM),
          RPD: Number(modelData.RPD),
          maxTokens: modelData.maxTokens ? Number(modelData.maxTokens) : 0,
          TPM: modelData.TPM ? Number(modelData.TPM) : 0,
          TPD: modelData.TPD ? Number(modelData.TPD) : 0,
        }
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  public static async updateModel(id: string, modelData: UpdateModelInput): Promise<AIModel> {
    try {
      return await prisma.aIModel.update({
        where: { id },
        data: {
          ...modelData,
          inputTokens: modelData.inputTokens ? Number(modelData.inputTokens) : 0,
          outputTokens: modelData.outputTokens ? Number(modelData.outputTokens) : 0,
          RPM: modelData.RPM ? Number(modelData.RPM) : 0,
          RPD: modelData.RPD ? Number(modelData.RPD) : 0,
          maxTokens: modelData.maxTokens ? Number(modelData.maxTokens) : 0,
          TPM: modelData.TPM ? Number(modelData.TPM) : 0,
          TPD: modelData.TPD ? Number(modelData.TPD) : 0,
        }
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  public static async deleteModel(id: string): Promise<AIModel> {
    try {
      return await prisma.aIModel.delete({
        where: { id }
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  public static async getAllModels(): Promise<AIModel[]> {
    try {
      return await prisma.aIModel.findMany({
        orderBy: { name: 'asc' }
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  public static async getLatestModel(): Promise<AIModel | null> {
    try {
      return await prisma.aIModel.findFirst({
        orderBy: {
          name: 'desc',
        },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  public static async getModelById(id: string): Promise<AIModel | null> {
    try {
      return await prisma.aIModel.findUnique({
        where: { id }
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  public static async getModelByName(name: ModelName): Promise<AIModel | null> {
    try {
      return await prisma.aIModel.findUnique({
        where: { name }
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  public static async bulkCreateModels(models: CreateModelInput[]): Promise<AIModel[]> {
    try {
      const createdModels = await prisma.$transaction(
        models.map(model => 
          prisma.aIModel.upsert({
            where: { name: model.name },
            create: {
              ...model,
              inputTokens: Number(model.inputTokens),
              outputTokens: Number(model.outputTokens),
              RPM: Number(model.RPM),
              RPD: Number(model.RPD),
              maxTokens: model.maxTokens ? Number(model.maxTokens) : null,
              TPM: model.TPM ? Number(model.TPM) : null,
              TPD: model.TPD ? Number(model.TPD) : null,
            },
            update: {
              ...model,
              inputTokens: Number(model.inputTokens),
              outputTokens: Number(model.outputTokens),
              RPM: Number(model.RPM),
              RPD: Number(model.RPD),
              maxTokens: model.maxTokens ? Number(model.maxTokens) : null,
              TPM: model.TPM ? Number(model.TPM) : null,
              TPD: model.TPD ? Number(model.TPD) : null,
            }
          })
        )
      );
      return createdModels;
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  public static async searchModels(query: string): Promise<AIModel[]> {
    try {
      return await prisma.aIModel.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { version: { contains: query, mode: 'insensitive' } },
          ]
        },
        orderBy: { name: 'asc' }
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }
}