const config = {
  poweredByHeader: false,
  devIndicators: false,
  env: { CARTAZ_REQUIRE_SUPABASE: process.env.CARTAZ_REQUIRE_SUPABASE || '' },
  experimental: { cpus: 2 }
};
export default config;
