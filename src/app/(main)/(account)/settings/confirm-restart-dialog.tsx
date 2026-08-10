"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function ConfirmRestartDialog({
    open,
    onOpenChange,
    onConfirm,
    onClose,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    onClose: () => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]" showCloseButton={false}>
                <DialogHeader>
                    <DialogTitle>Restart Required</DialogTitle>
                </DialogHeader>

                <p className="text-sm text-muted-foreground">
                    A restart of Nuxion is required for the changes to take effect.
                </p>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={onConfirm}>Restart</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}