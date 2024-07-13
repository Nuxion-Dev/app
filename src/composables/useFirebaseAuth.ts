import { createUserWithEmailAndPassword, signInWithEmailAndPassword, type User, type Auth, updateProfile} from 'firebase/auth'

export default function() {
    const auth: Auth = useNuxtApp().$auth as Auth;

    const user = useState<User | null>("fb_user", () => {
        return localStorage.getItem("fb_user") ? JSON.parse(localStorage.getItem("fb_user") as string) : null
    })
    const registerUser = async (email: string, password: string, displayName: string): Promise<boolean> => {
        try {
            const userCreds = await createUserWithEmailAndPassword(auth, email, password)
            if (userCreds) {
                user.value = userCreds.user
                localStorage.setItem("fb_user", JSON.stringify(userCreds.user))

                await updateProfile(userCreds.user, {
                    displayName,
                    photoURL: "../assets/img/default-photo.png"
                })
                return true
            }
        } catch (error: unknown) {
            if (error instanceof Error) {
                // handle error
            }
            return false
        }
        return false
    }

    const login = async (email: string, password: string): Promise<boolean> => {
        try {
            const userCreds = await signInWithEmailAndPassword(auth, email, password)
            if (userCreds) {
                user.value = userCreds.user
                localStorage.setItem("fb_user", JSON.stringify(userCreds.user))
                return true
            }
        } catch (error: unknown) {
            if (error instanceof Error) {
                // handle error
            }
            return false
        }
        return false
    }

    const update = async (fields: { displayName: string, photoURL: string | null | undefined }): Promise<boolean> => {
        if (user.value) {
            await updateProfile(user.value, fields);
            return true;
        }

        return false;
    }

    const logout = async () => {
        await auth.signOut()
        user.value = null
        localStorage.removeItem("fb_user")
    }

    return {
        user,
        update,
        registerUser,
        login,
        logout
    }
}