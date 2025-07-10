import { RequestObject } from '../types';

export class PresentationSession {
  requestObject: RequestObject;
  selectedClaims: Record<string, boolean> = {};
  excludedKeys: string[] = ['raw', 'cnf'];
  requiredClaims: string[] = [];

  constructor(requestObject: RequestObject) {
    this.requestObject = requestObject;
  }

  public setSelectedCredential(credential: Record<string, unknown>): {
    initialSelectedClaims: Record<string, boolean>;
    requiredClaims: string[];
  } {
    this.requiredClaims = this.getRequiredClaims();

    this.selectedClaims = Object.keys(credential)
      .filter((key) => !this.excludedKeys.includes(key))
      .reduce<Record<string, boolean>>((acc, key) => {
        acc[key] = this.requiredClaims.includes(key);
        return acc;
      }, {});

    return {
      initialSelectedClaims: this.selectedClaims,
      requiredClaims: this.requiredClaims,
    };
  }

  public getSelectedClaims(): Record<string, boolean> {
    return { ...this.selectedClaims };
  }

  public toggleClaim(claim: string): Record<string, boolean> {
    if (this.requiredClaims.includes(claim)) {
      return { ...this.selectedClaims };
    }

    this.selectedClaims[claim] = !this.selectedClaims[claim];
    return { ...this.selectedClaims };
  }

  public getRequiredClaims(): string[] {
    const query = this.requestObject.dcql_query;

    if (!query?.credentials?.[0]?.claims) {
      return [];
    }

    return query.credentials[0].claims.map((claim) => claim.path.join('.'));
  }
}
