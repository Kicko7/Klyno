import { FileLoaderInterface, SupportedFileType } from '../types';

// Dynamically import heavy loaders to reduce initial bundle size
const loadDocxLoader = async () => {
  const { DocxLoader } = await import('./docx');
  return DocxLoader;
};

const loadExcelLoader = async () => {
  const { ExcelLoader } = await import('./excel');
  return ExcelLoader;
};

const loadPdfLoader = async () => {
  const { PdfLoader } = await import('./pdf');
  return PdfLoader;
};

const loadPptxLoader = async () => {
  const { PptxLoader } = await import('./pptx');
  return PptxLoader;
};

const loadTextLoader = async () => {
  const { TextLoader } = await import('./text');
  return TextLoader;
};

// Loader configuration map with dynamic imports
export const fileLoaders: Record<SupportedFileType, () => Promise<new () => FileLoaderInterface>> =
  {
    docx: loadDocxLoader,
    excel: loadExcelLoader,
    pdf: loadPdfLoader,
    pptx: loadPptxLoader,
    txt: loadTextLoader,
  };

// Helper function to get loader instance
export const getFileLoader = async (
  fileType: SupportedFileType,
): Promise<new () => FileLoaderInterface> => {
  const loaderFactory = fileLoaders[fileType];
  if (!loaderFactory) {
    throw new Error(`Unsupported file type: ${fileType}`);
  }
  return await loaderFactory();
};
