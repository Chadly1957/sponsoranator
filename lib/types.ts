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
