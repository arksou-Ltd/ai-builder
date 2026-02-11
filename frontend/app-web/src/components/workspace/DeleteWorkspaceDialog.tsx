"use client";

/**
 * 删除工作空间确认对话框
 *
 * 使用 AlertDialog 进行二次确认，标题包含工作空间名称。
 * 确认后触发删除回调，取消则不执行任何操作。
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DeleteWorkspaceDialogProps {
  /** 待删除的工作空间名称 */
  workspaceName: string;
  /** 对话框是否打开 */
  open: boolean;
  /** 控制对话框开关 */
  onOpenChange: (open: boolean) => void;
  /** 确认删除回调 */
  onConfirm: () => void;
  /** 删除请求是否正在执行 */
  isPending: boolean;
}

export function DeleteWorkspaceDialog({
  workspaceName,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: DeleteWorkspaceDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            确认删除「{workspaceName}」？
          </AlertDialogTitle>
          <AlertDialogDescription>
            此操作将删除该工作空间。删除后，工作空间将从列表中移除。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isPending}
            className="cursor-pointer"
          >
            取消
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="bg-destructive text-white hover:bg-destructive/90 cursor-pointer"
          >
            {isPending ? "删除中…" : "确认删除"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
