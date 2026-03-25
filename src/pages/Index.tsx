import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center gap-4 bg-background">
      <Button className="bg-orange-btn text-orange-btn-foreground hover:bg-orange-btn/90">
        Botão Laranja
      </Button>
      <Button className="bg-blue-btn text-blue-btn-foreground hover:bg-blue-btn/90">
        Botão Azul
      </Button>
    </div>
  );
};

export default Index;
