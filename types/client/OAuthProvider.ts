// Provider IDs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/identity_platform_default_supported_idp_config#argument-reference
enum OAuthProvider {
  // https://developers.google.com/identity/openid-connect/openid-connect
  GOOGLE = "google.com",
  // https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow
  FACEBOOK = "facebook.com",
  // https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
  GITHUB = "github.com",
  // https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow
  MICROSOFT = "microsoft.com",
}

export default OAuthProvider;
