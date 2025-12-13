// Provider IDs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/identity_platform_default_supported_idp_config#argument-reference
enum OAuthProvider {
  GOOGLE = "google.com",
  FACEBOOK = "facebook.com",
  GITHUB = "github.com",
  MICROSOFT = "microsoft.com",
}

export default OAuthProvider;
