import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

export default function ErrorAlert({ title, message, children }: { title?: string, message?: string, children?: React.ReactNode }) {
    if (!message && !children) return null;
    
    return (
        <Alert variant="destructive">
            <AlertTitle>{title || "Error!"}</AlertTitle>
            <AlertDescription>
                {message || children}
            </AlertDescription>
        </Alert>
    );
}
