"use client";

/**
 * 创建工作空间对话框
 *
 * 使用 shadcn Dialog 受控模式 + Form 组件系统 + zodResolver。
 * 提交流程：loading → 调用 API → 成功关闭 / 失败显示错误。
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import { ApiError } from "@/lib/api-client";
import { createWorkspace, type WorkspaceResponse } from "@/lib/api/workspaces";

/** 允许的字符：字母、数字、中文、普通空格、连字符、下划线、点号 */
const VALID_NAME_PATTERN = /^[A-Za-z0-9_.\- \u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]+$/u;

/** 表单校验 Schema */
const formSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "工作空间名称不能为空")
    .max(50, "工作空间名称不能超过 50 个字符")
    .refine(
      (v) => VALID_NAME_PATTERN.test(v),
      "工作空间名称包含非法字符，仅允许字母、数字、中文、空格、连字符、下划线和点号",
    ),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onOptimisticCreate: (workspace: WorkspaceResponse) => void;
  getToken: () => Promise<string | null>;
}

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
  onSuccess,
  onOptimisticCreate,
  getToken,
}: CreateWorkspaceDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "" },
  });

  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(values: FormValues) {
    setServerError(null);

    try {
      const workspace = await createWorkspace(values.name, getToken);
      onOptimisticCreate(workspace);
      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.isConflict) {
          setServerError("工作空间名称已存在");
        } else if (error.isInvalidParams) {
          setServerError(error.message);
        } else {
          toast.error("操作失败，请稍后重试");
        }
      } else {
        toast.error("网络异常，请检查连接后重试");
      }
    }
  }

  function handleOpenChange(value: boolean) {
    if (!value) {
      form.reset();
      setServerError(null);
    }
    onOpenChange(value);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>创建工作空间</DialogTitle>
          <DialogDescription>
            为您的项目创建一个新的工作空间
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>工作空间名称</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="输入工作空间名称"
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {serverError && (
              <p className="text-destructive text-sm" role="alert">
                {serverError}
              </p>
            )}
            <DialogFooter>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="cursor-pointer"
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />
                )}
                创建
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
