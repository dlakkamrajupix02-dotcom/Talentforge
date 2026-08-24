/**
 * Utility to map browser timezones to country names and codes.
 * Defaults to USA if no match is found.
 */
export const inferCountryFromTimeZone = () => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return { code: "US", name: "USA" };

    // India
    if (tz === 'Asia/Calcutta' || tz === 'Asia/Kolkata') {
      return { code: "IN", name: "India" };
    }

    // USA
    if (
      tz.startsWith('America/') || 
      tz === 'US/Eastern' || 
      tz === 'US/Central' || 
      tz === 'US/Mountain' || 
      tz === 'US/Pacific' || 
      tz === 'US/Alaska' || 
      tz === 'US/Hawaii'
    ) {
      return { code: "US", name: "USA" };
    }

    // United Kingdom
    if (tz === 'Europe/London' || tz === 'GMT') {
      return { code: "UK", name: "United Kingdom" };
    }

    // Australia
    if (tz.startsWith('Australia/')) {
      return { code: "AU", name: "Australia" };
    }

    // Singapore
    if (tz === 'Asia/Singapore') {
      return { code: "SG", name: "Singapore" };
    }

    // Canada
    if (tz.startsWith('Canada/')) {
      return { code: "CA", name: "Canada" };
    }

    // Default Fallback to USA as requested
    return { code: "US", name: "USA" };
  } catch (error) {
    console.error("[locationHelper] TimeZone detection failed:", error);
    return { code: "US", name: "USA" };
  }
};

/**
 * Enriches a user object by replacing "Unknown" or missing country with inferred data.
 */
export const enrichUserProfile = (user) => {
  if (!user) return user;
  
  const enriched = { ...user };

  // Handle Country/Region "string" or "Unknown" bug
  const country = (enriched.country || "").trim().toLowerCase();
  if (!country || country === "unknown" || country === "string") {
    const inferred = inferCountryFromTimeZone();
    enriched.country = inferred.name;
    enriched.region = inferred.code;
  }

  // Handle Organization Name "string" bug
  if (enriched.company_name && enriched.company_name !== "string") {
    enriched.org_name = enriched.company_name;
  }
  const org = (enriched.org_name || "").trim().toLowerCase();
  if (!org || org === "string") {
    enriched.org_name = "Organization";
  }

  // Handle Region directly if it is "string"
  if (enriched.region === "string") {
    const inferred = inferCountryFromTimeZone();
    enriched.region = inferred.code;
  }

  // Handle Full Name
  if (!enriched.full_name || enriched.full_name === "string") {
    enriched.full_name = (enriched.email || "User").split('@')[0];
  }

  // Handle Role
  if (!enriched.role || enriched.role === "string") {
    enriched.role = "Member";
  }
  
  return enriched;
};
