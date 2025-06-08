import { decodeSdJwtSync, getClaimsSync } from '@sd-jwt/decode';
import { hasher } from '@sd-jwt/hash';

export function decodeSDJWT(sdjwt: string) {
  const decoded = decodeSdJwtSync(sdjwt, hasher);
  const header = decoded.jwt.header;

  const claims = getClaimsSync(
    decoded.jwt.payload,
    decoded.disclosures,
    hasher,
  );

  return { header, claims };
}
