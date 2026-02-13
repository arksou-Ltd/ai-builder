"use client";

/**
 * 创建工作空间对话框
 *
 * 使用 shadcn Dialog 受控模式 + Form 组件系统 + zodResolver。
 * 提交流程：loading → 调用 API → 成功关闭 / 失败显示错误。
 *
 * zod schema 使用工厂函数实现国际化验证消息。
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

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

/** 表单校验 Schema 工厂函数（支持国际化验证消息） */
function createFormSchema(t: (key: string) => string) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, t("nameRequired"))
      .max(50, t("nameMaxLength"))
      .refine(
        (v) => VALID_NAME_PATTERN.test(v),
        t("nameInvalidChars"),
      ),
  });
}

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
  const t = useTranslations("workspace.createDialog");
  const tError = useTranslations("workspace.error");
  const tCommon = useTranslations("common");

  const formSchema = createFormSchema(t);
  type FormValues = z.infer<typeof formSchema>;

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
          setServerError(t("nameConflict"));
        } else if (error.isInvalidParams) {
          setServerError(error.message);
        } else {
          toast.error(tError("operationFailed"));
        }
      } else {
        toast.error(tError("networkError"));
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
          <DialogTitle className="font-poppins">{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("nameLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("namePlaceholder")}
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
                {tCommon("create")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
