export interface CompanyDTO {
  id: string;
  name: string;
  logoPath: string | null;
  sourceUrl: string | null;
  logoScale: number;
}

export interface EventSponsorDTO {
  id: string;
  eventId: string;
  companyId: string;
  tier: string;
  order: number;
  scale: number;
  company: CompanyDTO;
}

export interface EventDTO {
  id: string;
  name: string;
  logoPath: string | null;
  primaryColor: string;
  accentColor: string;
  topTierLabel: string;
  logosPerRow: number;
  generalScale: number;
  showTierLabels: boolean;
  bronzeGeneralDivider: boolean;
  sponsors: EventSponsorDTO[];
}

export interface SignTemplateSizeDTO {
  id: string;
  templateId: string;
  label: string;
  pdfPath: string;
  pageWidth: number;
  pageHeight: number;
  textBoxX: number;
  textBoxY: number;
  textBoxW: number;
  textBoxH: number;
  logoBoxX: number;
  logoBoxY: number;
  logoBoxW: number;
  logoBoxH: number;
}

export interface SignTemplateDTO {
  id: string;
  name: string;
  textColor: string;
  sizes: SignTemplateSizeDTO[];
}

export interface SignDTO {
  id: string;
  signSetId: string;
  templateSizeId: string | null;
  companyId: string | null;
  companyName: string;
  sponsorship: string;
  sizeLabel: string;
  textOverride: string | null;
  order: number;
  pdfPath: string | null;
  status: string;
  note: string | null;
  company: CompanyDTO | null;
}

export interface SignSetDTO {
  id: string;
  name: string;
  templateId: string;
  template?: SignTemplateDTO;
  signs: SignDTO[];
}
