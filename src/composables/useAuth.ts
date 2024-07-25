import type User from "~/utils/types/User"

export default async function() {
    const sessionId = useCookie("session_id");
    sessionId.value = sessionId.value || Math.random().toString(36).substring(2);

    const token: string = useRuntimeConfig().public.AUTH_TOKEN;
    const { data: userData, error } = await useFetch("https://accounts.nuxion.org/get_user?sessionId=" + sessionId.value, {
        method: "GET",
        headers: {
            "Authorization": `${token}`
        },
    })
    let user: User | null = null;
    if (error.value) {
        console.error(error.value);
    } else {
        const data = userData.value as any;
        if (!data.error) {
            user = data.user;
        }
    }

    const registerUser = async (email: string, password: string, displayName: string): Promise<boolean> => {
        const { data, error } = await useFetch("https://accounts.nuxion.org/signup", {
            method: "POST",
            headers: {
                "Authorization": token
            },
            body: JSON.stringify({
                sessionId: sessionId.value,
                email,
                password,
                displayName
            })
        })

        if (error.value) {
            console.error(error.value);
            return false;
        }

        const response = data.value as any;
        if (response.error) {
            console.error(response.message);
            return false;
        }

        user = response.user;
        return true;
    }

    const login = async (email: string, password: string): Promise<boolean> => {
        const { data, error } = await useFetch("https://accounts.nuxion.org/signin", {
            method: "POST",
            headers: {
                "Authorization": token
            },
            body: JSON.stringify({
                sessionId: sessionId.value,
                email,
                password
            })
        })

        if (error.value) {
            console.error(error.value);
            return false;
        }

        const response = data.value as any;
        if (response.error) {
            console.error(response.message);
            return false;
        }

        user = response.user;
        return true;
    }

    const getUser = async (id: string): Promise<User | null> => {
        const { data, error } = await useFetch("https://accounts.nuxion.org/get_user?id=" + id, {
            method: "GET",
            headers: {
                "Authorization": token
            }
        });

        if (error.value) {
            console.error(error.value);
            return null;
        }

        const response = data.value as any;
        if (response.error) {
            console.error(response.message);
            return null;
        }

        return response.user;
    }

    const update = async (id: string, values: Record<string, any>): Promise<boolean> => {

        return false;
    }

    const logout = async () => {
        await useFetch("https://accounts.nuxion.org/signout", {
            method: "POST",
            headers: {
                "Authorization": token
            },
            body: JSON.stringify({
                sessionId: sessionId.value
            })
        })
        user = null;
    }

    const isLoggedIn = () => {
        return user !== null;
    }

    return {
        user,
        isLoggedIn,
        update,
        getUser,
        registerUser,
        login,
        logout
    }
}