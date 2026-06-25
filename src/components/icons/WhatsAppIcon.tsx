import { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & {
  size?: number | string;
  /**
   * When true, renders the official green WhatsApp glyph on its brand circle.
   * When false, renders only the monochrome glyph using currentColor.
   */
  filled?: boolean;
};

/**
 * Official WhatsApp icon. Default rendering uses the brand green (#25D366)
 * background with the white glyph, matching WhatsApp's visual identity.
 */
export function WhatsAppIcon({ size = 24, filled = true, ...props }: Props) {
  if (filled) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 32 32"
        width={size}
        height={size}
        aria-hidden="true"
        {...props}
      >
        <circle cx="16" cy="16" r="16" fill="#25D366" />
        <path
          fill="#FFFFFF"
          d="M22.7 9.3A9.2 9.2 0 0 0 7.2 19.5L6 24l4.6-1.2a9.2 9.2 0 0 0 4.4 1.1h.1A9.2 9.2 0 0 0 22.7 9.3Zm-7.6 13.1a7.6 7.6 0 0 1-3.9-1.1l-.3-.2-2.7.7.7-2.6-.2-.3a7.6 7.6 0 1 1 6.4 3.5Zm4.2-5.7c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1-.2.2-.6.8-.8 1-.1.1-.3.2-.5.1-.2-.1-1-.4-1.9-1.2-.7-.6-1.2-1.4-1.3-1.6-.1-.2 0-.4.1-.5l.4-.4c.1-.1.2-.2.2-.4 0-.1 0-.3-.1-.4l-.7-1.7c-.2-.5-.4-.4-.5-.4h-.5c-.2 0-.4 0-.6.2-.2.2-.8.8-.8 2s.8 2.3.9 2.5c.1.2 1.7 2.6 4.1 3.6.6.3 1 .4 1.4.5.6.2 1.1.2 1.5.1.5-.1 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1-.1-.1-.2-.1-.4-.2Z"
        />
      </svg>
    );
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.4-.1-.6.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.5-.5c.1-.2.2-.3.3-.5.1-.2 0-.3 0-.5l-.8-2c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.4 0 1.4 1 2.7 1.2 2.9.1.2 2 3 4.8 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 2-1.4.2-.6.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3ZM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.1-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.6 0-3.2-.4-4.6-1.3l-.3-.2-3 .8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2Z" />
    </svg>
  );
}

export default WhatsAppIcon;