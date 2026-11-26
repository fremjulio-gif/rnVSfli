import { z } from 'zod';

export const CAMP_VALUES = ['LFI', 'RN', 'LR', 'CENTRE', 'PS', 'ECOLO'] as const;
export const CATEGORIE_VALUES = [
  'financement_probite',
  'presse_expression',
  'ordre_public_biens',
] as const;
export const SECTION_VALUES = ['decisions', 'procedures_en_cours'] as const;
export const STATUT_PROCEDURES_EN_COURS = [
  'enquete',
  'mis_en_examen',
  'renvoye',
] as const;
export const STATUT_DECISIONS = [
  'condamne_premiere_instance',
  'condamne_appel',
  'condamnation_definitive',
  'relaxe',
  'non_lieu',
  'prescription',
] as const;
export const STATUT_VALUES = [
  ...STATUT_PROCEDURES_EN_COURS,
  ...STATUT_DECISIONS,
] as const;
export const STATUTS_DEFINITIFS = [
  'condamnation_definitive',
  'relaxe',
  'non_lieu',
  'prescription',
] as const;

export const OFFICIAL_PRIMARY_DOMAINS = [
  'justice.fr',
  'courdecassation.fr',
  'legifrance.gouv.fr',
  'conseil-etat.fr',
  'cnccfp.fr',
  'eppo.europa.eu',
  'conseil-constitutionnel.fr',
  'hudoc.echr.coe.int',
  'juridique.defenseurdesdroits.fr',
] as const;

const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date attendue au format YYYY-MM-DD');

export const SourceSchema = z.object({
  url: z.string().url('URL de source invalide'),
  type: z.enum(['primaire', 'presse']),
  titre: z.string().min(4),
  editeur: z.string().min(2),
  date_publication: z.string().min(4),
  date_consultation: IsoDateSchema,
});

export const PersonneEntiteSchema = z.object({
  nom: z.string().min(2),
  qualite: z.string().min(2),
  type: z.enum(['personne_morale', 'personne_physique']),
});

export const DateCleSchema = z.object({
  date: IsoDateSchema,
  libelle: z.string().min(4),
});

export const PeineSchema = z.object({
  prison: z.string().min(2).optional(),
  amende: z.string().min(2).optional(),
  ineligibilite: z.string().min(2).optional(),
  execution_provisoire: z.string().min(2).optional(),
  autres: z.string().min(2).optional(),
  note_recours: z.string().min(5),
});

export const CaseSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    camp: z.enum(CAMP_VALUES),
    parti_precis: z.string().min(2).optional(),
    categorie: z.enum(CATEGORIE_VALUES),
    section: z.enum(SECTION_VALUES),
    statut: z.enum(STATUT_VALUES),
    est_definitif: z.boolean(),
    presomption_innocence: z.boolean(),
    type_entite: z.enum([
      'personne_morale',
      'personne_physique',
      'personne_morale_et_physique',
    ]),
    entite_principale: z.string().min(2),
    personnes_et_entites: z.array(PersonneEntiteSchema).min(1),
    titre: z.string().min(5),
    qualification_legale: z.string().min(5),
    resume_factuel: z.string().min(15),
    juridiction: z.string().min(3),
    dates_cles: z.array(DateCleSchema).min(1),
    date_derniere_decision: IsoDateSchema,
    peine: PeineSchema.nullable().optional(),
    references_judiciaires: z.array(z.string().min(2)).default([]),
    fighter_slugs: z.array(z.string().min(2)).default([]),
    confirmation_primaire: z.enum(['confirme', 'non_confirme_en_ligne']),
    motif_absence_source_primaire: z.string().min(10).optional(),
    sources: z.array(SourceSchema).min(1, 'Au moins une source est obligatoire'),
    verified_at: IsoDateSchema,
  })
  .superRefine((item, ctx) => {
    const isEnCours = (STATUT_PROCEDURES_EN_COURS as readonly string[]).includes(
      item.statut,
    );
    const isDefinitifStatus = (STATUTS_DEFINITIFS as readonly string[]).includes(
      item.statut,
    );

    if (item.section === 'procedures_en_cours' && !isEnCours) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['section'],
        message: `Statut "${item.statut}" incompatible avec section "procedures_en_cours".`,
      });
    }
    if (item.section === 'decisions' && isEnCours) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['section'],
        message: `Statut "${item.statut}" ne peut pas figurer dans "decisions".`,
      });
    }

    if (item.statut === 'relaxe') {
      if (item.presomption_innocence !== !item.est_definitif) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['presomption_innocence'],
          message: `presomption_innocence doit être exactement !est_definitif.`,
        });
      }
    } else if (item.est_definitif !== isDefinitifStatus) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['est_definitif'],
        message: `est_definitif (${item.est_definitif}) incohérent avec le statut "${item.statut}".`,
      });
    }

    if (item.presomption_innocence !== !item.est_definitif) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['presomption_innocence'],
        message: `presomption_innocence doit être exactement !est_definitif.`,
      });
    }

    const requiresSentence = [
      'condamne_premiere_instance',
      'condamne_appel',
      'condamnation_definitive',
    ].includes(item.statut);
    if (requiresSentence && !item.peine) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['peine'],
        message: `Une fiche au statut "${item.statut}" doit détailler les peines et voies de recours.`,
      });
    }

    if (item.confirmation_primaire === 'confirme') {
      const hasOfficialPrimary = item.sources.some((s) => {
        if (s.type !== 'primaire') return false;
        try {
          const host = new URL(s.url).hostname.toLowerCase();
          return OFFICIAL_PRIMARY_DOMAINS.some(
            (domain) => host === domain || host.endsWith(`.${domain}`),
          );
        } catch {
          return false;
        }
      });
      if (!hasOfficialPrimary) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['sources'],
          message:
            'confirmation_primaire="confirme" exige au moins une source primaire sur un domaine officiel.',
        });
      }
    } else if (!item.motif_absence_source_primaire) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['motif_absence_source_primaire'],
        message:
          'motif_absence_source_primaire est requis lorsque confirmation_primaire="non_confirme_en_ligne".',
      });
    }
  });

export const DatasetSchema = z
  .object({
    reference_date: IsoDateSchema,
    cases: z.array(CaseSchema).min(2),
  })
  .superRefine((data, ctx) => {
    const seen = new Set<string>();
    for (const c of data.cases) {
      if (seen.has(c.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['cases'],
          message: `Identifiant dupliqué: ${c.id}`,
        });
      }
      seen.add(c.id);
    }
  });

export type JudicialCase = z.infer<typeof CaseSchema>;
export type JudicialDataset = z.infer<typeof DatasetSchema>;
export type Camp = (typeof CAMP_VALUES)[number];
export type Categorie = (typeof CATEGORIE_VALUES)[number];
export type Statut = (typeof STATUT_VALUES)[number];
