import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitial } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function UserAvatar({ name, email, avatarUrl, size = "md", className }: UserAvatarProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
  };

  return (
    <Avatar className={cn(sizeClasses[size], "border border-[#C7D6FF] bg-[#EAF0FF]", className)}>
      <AvatarImage src={avatarUrl || undefined} alt={name || "User"} className="object-cover" />
      <AvatarFallback className="bg-[#EAF0FF] text-[#3157D5] font-semibold">
        {getInitial(name, email)}
      </AvatarFallback>
    </Avatar>
  );
}
