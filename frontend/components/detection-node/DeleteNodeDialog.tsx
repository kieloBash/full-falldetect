// location: frontend/components/detection-node/DeleteNodeDialog.tsx
"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { DetectionNode } from "@/lib/detection-node/types";

type Props = {
  node: DetectionNode | null;
  isDeleting: boolean;
  error: Error | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteNodeDialog({ node, isDeleting, error, onCancel, onConfirm }: Props) {
  return (
    <AlertDialog open={node !== null} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {node?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Its cameras stay assigned to their rooms. If this laptop is still running, it will
            reappear within 30 seconds.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm text-destructive">{error.message}</p>}
        <AlertDialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isDeleting}>
            Keep node
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? "Removing…" : "Remove node"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
