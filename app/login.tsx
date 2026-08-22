import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  loginWithEmail,
  loginWithGoogle,
  logoutUser,
  registerWithEmail,
} from "../services/authService";
import { saveSellerProfile } from "../services/sellerService";
import { useAuth } from "../context/authContextValue";

function getAuthErrorMessage(error: any) {
  switch (error?.code) {
    case "auth/email-already-in-use":
      return "An account already exists with this email.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/invalid-credential":
      return "The email or password is incorrect.";
    case "auth/weak-password":
      return "Please use a stronger password.";
    case "auth/email-not-verified":
      return "Please verify your email address before logging in.";
    case "auth/popup-closed-by-user":
      return "Google login was cancelled.";
    case "auth/google-signin-unavailable":
      return "Google sign-in needs a development build of the app — it isn't available in this preview.";
    default:
      return "Authentication failed. Please try again.";
  }
}

export default function LoginPage() {
  const { refreshSellerProfile } = useAuth();

  const [formMode, setFormMode] = useState<"login" | "register">("login");
  const [ownerName, setOwnerName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRegisterMode = formMode === "register";

  function changeFormMode(newMode: "login" | "register") {
    setFormMode(newMode);
    setErrorMessage("");
    setSuccessMessage("");
    setOwnerName("");
    setBusinessName("");
    setEmail("");
    setPassword("");
  }

  async function handleGoogleLogin() {
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      await loginWithGoogle();
      await refreshSellerProfile();
      router.replace("/(tabs)");
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit() {
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      if (isRegisterMode) {
        const registeredUser = await registerWithEmail(
          ownerName,
          email,
          password,
        );

        await saveSellerProfile(registeredUser, { ownerName, businessName });

        // Keep the new account signed out until the seller verifies their email.
        await logoutUser();

        setSuccessMessage(
          "Verification email sent. Please check your inbox before logging in.",
        );
        changeFormMode("login");
        return;
      }

      await loginWithEmail(email, password);
      await refreshSellerProfile();
      router.replace("/(tabs)");
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.heading}>
            <Image
              source={require("../assets/images/vendly-logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.subtitle}>
              {isRegisterMode
                ? "Create your seller account."
                : "Login to manage your business."}
            </Text>
          </View>

          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, !isRegisterMode && styles.tabActive]}
              onPress={() => changeFormMode("login")}
            >
              <Text
                style={[styles.tabText, !isRegisterMode && styles.tabTextActive]}
              >
                Login
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, isRegisterMode && styles.tabActive]}
              onPress={() => changeFormMode("register")}
            >
              <Text
                style={[styles.tabText, isRegisterMode && styles.tabTextActive]}
              >
                Register
              </Text>
            </TouchableOpacity>
          </View>

          {isRegisterMode && (
            <View style={styles.field}>
              <Text style={styles.label}>Owner name</Text>
              <TextInput
                style={styles.input}
                value={ownerName}
                onChangeText={setOwnerName}
                placeholder="Enter your name"
                autoCapitalize="words"
              />
            </View>
          )}

          {isRegisterMode && (
            <View style={styles.field}>
              <Text style={styles.label}>Business name</Text>
              <TextInput
                style={styles.input}
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="Example: VS Tech Store"
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Email address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="seller@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
              autoComplete={isRegisterMode ? "new-password" : "current-password"}
            />
          </View>

          {errorMessage ? (
            <Text style={styles.error}>{errorMessage}</Text>
          ) : null}

          {successMessage ? (
            <Text style={styles.success}>{successMessage}</Text>
          ) : null}

          <TouchableOpacity
            style={styles.submit}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitText}>
                {isRegisterMode ? "Create account" : "Login"}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleLogin}
            disabled={isSubmitting}
          >
            <Image
              source={require("../assets/images/google-logo.webp")}
              style={styles.googleLogo}
              resizeMode="contain"
            />
            <Text style={styles.googleButtonText}>Sign in with Google</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#dbe4ee",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  heading: {
    alignItems: "center",
    marginBottom: 20,
  },
  logo: {
    width: 160,
    height: 60,
    marginBottom: 10,
  },
  subtitle: {
    color: "#526b87",
    fontSize: 14,
    textAlign: "center",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "#168cf5",
  },
  tabText: {
    color: "#526b87",
    fontWeight: "600",
    fontSize: 14,
  },
  tabTextActive: {
    color: "#ffffff",
  },
  field: {
    marginBottom: 14,
  },
  label: {
    color: "#102f50",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#dbe4ee",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#08213f",
    backgroundColor: "#f8fafc",
  },
  error: {
    color: "#b91c1c",
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 10,
  },
  success: {
    color: "#0f766e",
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 10,
  },
  submit: {
    backgroundColor: "#168cf5",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 6,
  },
  submitText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 18,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#dbe4ee",
  },
  dividerText: {
    color: "#71849a",
    fontSize: 12,
    fontWeight: "600",
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#dbe4ee",
    borderRadius: 10,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
  },
  googleLogo: {
    width: 20,
    height: 20,
  },
  googleButtonText: {
    color: "#102f50",
    fontWeight: "600",
    fontSize: 14,
  },
});
