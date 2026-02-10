/**
 * Domain normalization utility
 */

export const normalizeDomain = (domain: string): string => {
  if (!domain) return "";
  
  // Remove protocol, www., and trailing paths/queries
  return domain
    .replace(/^(https?:\/\/)?(www\.)?/, "")
    .split("/")[0]
    .toLowerCase();
};
