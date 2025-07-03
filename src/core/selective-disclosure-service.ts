import { rawDCQL } from '../types';

export class SelectiveDisclosureService {
  private selectedClaims: Record<string, boolean>;
  private excludedKeys: readonly string[];
  private requiredClaims: readonly string[];

  constructor() {
    this.selectedClaims = {};
  }

  public initialize(
    credential: Record<string, unknown> | null,
    query: rawDCQL,
    excludedKeys?: readonly string[],
  ): {
    initialOptions: Record<string, boolean>;
    requiredClaims: string[];
  } {
    if (!credential) {
      this.selectedClaims = {};
      return { initialOptions: {}, requiredClaims: [] };
    }

    this.requiredClaims = this.getRequiredClaimsFromDCQL(query);

    this.excludedKeys = excludedKeys ?? ['raw', 'cnf'];

    this.selectedClaims = Object.keys(credential)
      .filter((key) => !this.excludedKeys.includes(key))
      .reduce<Record<string, boolean>>((acc, key) => {
        acc[key] = this.requiredClaims.includes(key);
        return acc;
      }, {});

    return {
      initialOptions: { ...this.selectedClaims },
      requiredClaims: [...this.requiredClaims],
    };
  }

  public toggle(claim: string): Record<string, boolean> {
    if (this.requiredClaims.includes(claim)) {
      return { ...this.selectedClaims };
    }

    this.selectedClaims[claim] = !this.selectedClaims[claim];
    return { ...this.selectedClaims };
  }

  public getSelectedClaims(): Record<string, boolean> {
    return { ...this.selectedClaims };
  }

  public getRequiredClaimsFromDCQL(query: rawDCQL): string[] {
    if (!query?.credentials?.[0]?.claims) {
      return [];
    }

    return query.credentials[0].claims.map((claim) => claim.path.join('.'));
  }
}
