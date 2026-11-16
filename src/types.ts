export interface ScheduleTile {
  label: string;
  value: string;
}

export interface FeatureStep {
  code: string;
  title: string;
  detail: string;
}

export interface Project {
  id: string;
  title: string;
  arabicTitle: string;
  category: string;
  years: string;
  role: string;
  tagline: string;
  description: string;
  writtenNarrative: string;
  imageSrc: string;
  hoverImageSrc: string;
  badge?: string;
  tags: string[];
  scheduleTiles: ScheduleTile[];
  workflowSteps: FeatureStep[];
  deliverables: string[];
  metrics: string[];
  colorTheme: string;
  accentBg: string;
  previewType: 'tawreed-b2b' | 'arabic-edtech' | 'desert-app';
  behanceCaseStudyUrl?: string;
  showcaseVideo?: {
    src: string;
    captionLeft: string;
    captionRight: string;
  };
  extraGallery?: {
    src: string;
    alt: string;
    captionLeft: string;
    captionRight: string;
  }[];
}

export interface HorizontalCard {
  id: string;
  number: string;
  title: string;
  category: string;
  description: string;
  tech: string[];
  metric: string;
  color: string;
}
