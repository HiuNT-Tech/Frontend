'use client';

import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input, type InputProps } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type PasswordInputProps = Omit<InputProps, 'type' | 'customNode'>;

/** Ô mật khẩu có nút con mắt để hiện/ẩn nội dung đang gõ. */
const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);

    return (
      <Input
        ref={ref}
        type={visible ? 'text' : 'password'}
        className={cn(className, 'pr-11')}
        customNode={
          <button
            type="button"
            onClick={() => setVisible(prev => !prev)}
            aria-label={
              visible
                ? t('auth.fields.hidePassword')
                : t('auth.fields.showPassword')
            }
            aria-pressed={visible}
            className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition-colors duration-200 ease-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
          >
            {visible ? (
              <EyeOff className="size-[18px]" aria-hidden="true" />
            ) : (
              <Eye className="size-[18px]" aria-hidden="true" />
            )}
          </button>
        }
        {...props}
      />
    );
  }
);
PasswordInput.displayName = 'PasswordInput';

export { PasswordInput };
