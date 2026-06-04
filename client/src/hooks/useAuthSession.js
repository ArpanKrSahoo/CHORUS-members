import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { isPredefinedAdminEmail } from "../constants/adminEmails";
import { auth, db } from "../lib/firebase";

const DEFAULT_ROLE = "member";

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

async function loadUserRole(user) {
  if (isPredefinedAdminEmail(user.email)) {
    return "admin";
  }

  if (!db || !user.email) {
    return DEFAULT_ROLE;
  }

  const memberRef = doc(db, "members", normalizeEmail(user.email));
  const memberSnapshot = await getDoc(memberRef);

  if (memberSnapshot.exists()) {
    return memberSnapshot.data().role ?? DEFAULT_ROLE;
  }

  await setDoc(memberRef, {
    authUid: user.uid,
    createdAt: serverTimestamp(),
    email: normalizeEmail(user.email),
    role: DEFAULT_ROLE,
  });

  return DEFAULT_ROLE;
}

export function useAuthSession() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [userRole, setUserRole] = useState(DEFAULT_ROLE);

  useEffect(() => {
    let isMounted = true;

    if (!auth) {
      setIsAuthReady(true);
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;

      setCurrentUser(user);
      setIsAuthReady(false);

      if (!user) {
        setUserRole(DEFAULT_ROLE);
        setIsAuthReady(true);
        return;
      }

      try {
        const role = await loadUserRole(user);
        if (isMounted) {
          setUserRole(role);
        }
      } catch {
        if (isMounted) {
          setUserRole(DEFAULT_ROLE);
        }
      } finally {
        if (isMounted) {
          setIsAuthReady(true);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return {
    currentUser,
    isAdmin: userRole === "admin",
    isDirector: userRole === "director",
    isAuthReady,
    userRole,
  };
}
