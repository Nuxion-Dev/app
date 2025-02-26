import type User from "~/utils/types/User";

let user: User | null = null;
let pfp: string | null = null;
export default async function () {
    const sessionId = useCookie("session_id", { maxAge: 60 * 60 * 24 * 7 * 4 });

    const token: string = useRuntimeConfig().public.AUTH_TOKEN;
    if (!user) {
        const userData: any = await $fetch("https://accounts.nuxion.org/get_user?sessionId=" + sessionId.value, {
        //const { data: userData, error } = await useFetch("http://127.0.0.1:5924/get_user?sessionId=" + sessionId.value, {
                method: "GET",
                headers: {
                    Authorization: `${token}`,
                },
            }
        );
        if (userData.error) {
            console.error(userData.message);
        } else {
            user = userData.user;
        }
    }

    const registerUser = async (
        id: string,
        email: string,
        password: string,
        displayName: string
    ): Promise<boolean> => {
        const response: any = await $fetch("https://accounts.nuxion.org/signup", {
        //const { data, error } = await useFetch("http://127.0.0.1:5924/signup", {
            method: "POST",
            headers: {
                Authorization: token,
            },
            body: JSON.stringify({
                sessionId: sessionId.value,
                id,
                email,
                password,
                displayName,
            }),
        });

        if (response.error) {
            console.error(response.message);
            return false;
        }

        user = response.user;
        return true;
    };

    const login = async (email: string, password: string): Promise<boolean> => {
        const response: any = await $fetch("https://accounts.nuxion.org/signin", {
        //const { data, error } = await useFetch("http://127.0.0.1:5924/signin", {
            method: "POST",
            headers: {
                Authorization: token,
            },
            body: JSON.stringify({
                sessionId: sessionId.value,
                email,
                password,
            }),
        });

        if (response.error) {
            console.error(response.message);
            return false;
        }

        sessionId.value = response.user.sessionId;
        user = response.user;
        return true;
    };

    const getUser = async (emailOrId: string): Promise<User | null> => {
        const isEmail = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/.test(
            emailOrId
        );
        const { data, error } = await useFetch("https://accounts.nuxion.org/get_user?" +
        //const { data, error } = await useFetch("http://127.0.0.1:5924/get_user?" +
                (isEmail ? "email=" : "id=") +
                emailOrId,
            {
                method: "GET",
                headers: {
                    Authorization: token,
                },
            }
        );

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
    };

    const update = async (
        id: string,
        values: Record<string, any>
    ): Promise<boolean> => {
        const updated = {
            ...values,
            photoUrl: undefined,
        };
        const data = await $fetch("https://accounts.nuxion.org/update_user", {
        //const { data, error } = await useFetch("http://127.0.0.1:5924/update_user", {
                method: "POST",
                headers: {
                    Authorization: token,
                },
                body: JSON.stringify({
                    sessionId: sessionId.value,
                    id,
                    values: updated,
                }),
            }
        );

        return false;
    };

    const setPfp = async (file: File): Promise<boolean> => {
        const formData = new FormData();
        formData.append("sessionId", sessionId.value || "");
        formData.append("file", file);

        const { data, error } = await useFetch("https://accounts.nuxion.org/set_pfp", {
        //const { data, error } = await useFetch("http://127.0.0.1:5924/set_pfp", {
                method: "POST",
                headers: {
                    Authorization: token,
                },
                body: formData,
            }
        );
        
        if (error.value) {
            console.error(error.value);
            return false;
        }

        pfp = URL.createObjectURL(file);
        return true;
    };

    const getPfp = async (): Promise<any> => {
        if (pfp) return pfp;
        if (!sessionId.value) return null;
    
        const response = await fetch("https://accounts.nuxion.org/get_pfp?sessionId=" + sessionId.value, {
        //const response = await fetch("http://127.0.0.1:5924/get_pfp?sessionId=" + sessionId.value, {
                method: "GET",
                headers: {
                    Authorization: token,
                },
            }
        );

        if (!response.ok) {
            return null;
        }

        if (response.status !== 200) {
            return null;
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        pfp = url;
        return url;
    };

    const getPfpOfUser = async (id: string): Promise<any> => {
        const response = await fetch("https://accounts.nuxion.org/get_pfp?id=" + id, {
        //const response = await fetch("http://127.0.0.1:5924/get_pfp?id=" + id, {
            method: "GET",
            headers: {
                Authorization: token,
            },
        });

        const defaultImage = (await import("../assets/img/default-photo.png")).default;
        if (!response.ok) {
            return defaultImage;
        }

        if (response.status !== 200) {
            return defaultImage;
        }

        const blob = await response.blob();
        return URL.createObjectURL(blob);
    };

    const logout = async () => {
        await $fetch("https://accounts.nuxion.org/signout", {
        //await $fetch("http://127.0.0.1:5924/signout", {
            method: "POST",
            headers: {
                Authorization: token,
            },
            body: JSON.stringify({
                sessionId: sessionId.value,
            }),
        });
        user = null;
    };

    const isLoggedIn = () => {
        return user !== null;
    };

    const refresh = async () => {
        const userData: any = await $fetch("https://accounts.nuxion.org/get_user?sessionId=" + sessionId.value, {
        //const { data: userData, error } = await useFetch("http://127.0.0.1:5924/get_user?sessionId=" + sessionId.value, {
            method: "GET",
            headers: {
                "Authorization": `${token}`
            },
        })
        if (userData.error) {
            console.error(userData.message);
        } else {
            user = userData.user;
        }
    }

    return {
        user,
        isLoggedIn,
        update,
        getUser,
        registerUser,
        login,
        logout,
        getPfp,
        setPfp,
        getPfpOfUser,
        refresh
    };
}
