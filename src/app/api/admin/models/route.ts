import { NextRequest, NextResponse } from 'next/server';
import { ModelManager } from '@/utils/storage';

export async function GET() {
  try {
    const models = await ModelManager.getAllModels();
    return NextResponse.json(models, { status: 200 });
  } catch (error) {
    console.log("this is errors", error)
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
}

interface ModelRequest {
  name: ModelName;
  version: string;
  description?: string;
  TPM?: string | number;
  TPD?: string | number;
  RPM: string | number;
  RPD: string | number;
  maxTokens?: string | number;
  inputTokens: string | number;
  outputTokens: string | number;
}

export async function POST(request: NextRequest) {
  try {
    const body: ModelRequest = await request.json();
    const data = {
      ...body,
      TPM: body.TPM ? Number(body.TPM) : 0,
      TPD: body.TPD ? Number(body.TPD) : 0,
      RPM: Number(body.RPM),
      RPD: Number(body.RPD),
      maxTokens: body.maxTokens ? Number(body.maxTokens) : 0,
      inputTokens: Number(body.inputTokens),
      outputTokens: Number(body.outputTokens),
    };

    if (
      isNaN(data.RPM) ||
      isNaN(data.RPD) ||
      isNaN(data.inputTokens) ||
      isNaN(data.outputTokens)
    ) {
      return NextResponse.json(
        { error: 'Invalid numeric values provided' },
        { status: 400 }
      );
    }

    const newModel = await ModelManager.createModel(data);
    
    return NextResponse.json(newModel, { status: 201 });
  } catch (error) {
    console.error('Model creation error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create model' },
      { status: 500 }
    );
  }
}