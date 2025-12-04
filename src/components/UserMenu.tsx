import { LogOut, Cloud, LogIn, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";

export function UserMenu() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="gap-2">
          <LogIn className="w-4 h-4" />
          Entrar
        </Button>
        <Button variant="default" size="sm" onClick={() => navigate("/auth")} className="gap-2">
          <UserPlus className="w-4 h-4" />
          Criar conta
        </Button>
      </div>
    );
  }

  const initials = profile?.display_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || user.email?.[0].toUpperCase() || "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-xl p-0 hover:bg-secondary">
          <Avatar className="h-10 w-10 rounded-xl">
            <AvatarImage src={profile?.avatar_url || undefined} className="rounded-xl" />
            <AvatarFallback className="rounded-xl bg-primary/20 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 bg-card border-border">
        <div className="flex items-center gap-3 p-3">
          <Avatar className="h-11 w-11 rounded-xl">
            <AvatarImage src={profile?.avatar_url || undefined} className="rounded-xl" />
            <AvatarFallback className="rounded-xl bg-primary/20 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col space-y-0.5 min-w-0">
            <p className="text-sm font-semibold leading-none text-foreground truncate">
              {profile?.display_name || "Usuário"}
            </p>
            <p className="text-xs leading-none text-muted-foreground truncate">
              {user.email}
            </p>
          </div>
        </div>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem className="gap-2.5 text-muted-foreground py-2.5 cursor-default">
          <div className="w-5 h-5 rounded bg-accent/20 flex items-center justify-center">
            <Cloud className="w-3 h-3 text-accent" />
          </div>
          Histórico sincronizado
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem
          className="gap-2.5 text-destructive focus:text-destructive py-2.5 cursor-pointer"
          onClick={() => signOut()}
        >
          <div className="w-5 h-5 rounded bg-destructive/20 flex items-center justify-center">
            <LogOut className="w-3 h-3" />
          </div>
          Sair da conta
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
