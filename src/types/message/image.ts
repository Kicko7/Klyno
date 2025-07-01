export interface chatimageitem {
  alt: string;
  id: string;
  url: string;
}

export interface chatimagechunk {
  data: string;
  id: string;
  isbase64?: boolean;
}
