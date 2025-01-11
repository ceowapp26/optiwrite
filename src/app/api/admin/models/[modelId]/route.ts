import { NextRequest, NextResponse } from 'next/server';
import { ModelManager } from '@/utils/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const model = await ModelManager.getModelById(params.id);
    if (!model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(model, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch model' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { modelId: string } }
) {
  try {
    const data = await request.json();
    const updatedModel = await ModelManager.updateModel(params.modelId, data);
    return NextResponse.json(updatedModel, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update model' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { modelId: string } }
) {
  try {
    const deletedModel = await ModelManager.deleteModel(params.modelId);
    return NextResponse.json(deletedModel, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete model' },
      { status: 500 }
    );
  }
}