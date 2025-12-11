import React from 'react';

export enum ToolType {
  ProductPhoto = 'product-photo',
  FashionCatalogue = 'fashion-catalogue',
  FashionMixMatch = 'fashion-mix-match',
  HireModel = 'hire-model',
  PhotoStudio = 'photo-studio',
  PreWedding = 'pre-wedding',
  Rebrand = 'rebrand',
  Mockup = 'mockup'
}

export interface ToolConfig {
  id: ToolType;
  label: string;
  icon: React.FC<any>; // Lucide icon type approximation
  description: string;
  promptPlaceholder: string;
  requiresImage?: boolean;
}

export interface GeneratedImage {
  url: string;
  prompt: string;
  timestamp: number;
}