import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { toast } from "@/hooks/use-toast";

function UploadTest() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handler para selecionar arquivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);

    // Criar preview da imagem
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  // Handler para enviar arquivo
  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Selecione um arquivo para fazer upload",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    
    try {
      console.log("Iniciando upload da imagem:", selectedFile.name, selectedFile.type, selectedFile.size);
      
      const formData = new FormData();
      formData.append("image", selectedFile);
      
      // Usar o endpoint de teste
      const response = await fetch("/api/test-upload", {
        method: "POST",
        body: formData,
      });
      
      const responseText = await response.text();
      console.log("Resposta bruta:", responseText);
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error("Erro ao parsear resposta JSON:", e);
        throw new Error(`Resposta inválida do servidor: ${responseText}`);
      }
      
      if (!response.ok) {
        throw new Error(`Falha no upload: ${result.message || response.statusText}`);
      }
      
      console.log("Upload concluído com sucesso:", result);
      setUploadResult(result);
      
      toast({
        title: "Upload concluído com sucesso",
        description: "A imagem foi enviada com sucesso",
      });
    } catch (error: any) {
      console.error("Erro durante upload:", error);
      
      toast({
        title: "Erro ao fazer upload",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  // Handler para limpar seleção
  const handleClear = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <AdminLayout title="Teste de Upload">
      <div className="container mx-auto py-8">
        <Card className="max-w-lg mx-auto">
          <CardHeader>
            <CardTitle>Teste de Upload de Imagem</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="block font-medium">Selecione uma imagem:</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                ref={fileInputRef}
                className="block w-full text-sm file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0 file:font-medium
                file:bg-primary file:text-primary-foreground
                hover:file:bg-primary/90"
              />
            </div>

            {previewUrl && (
              <div className="space-y-2">
                <p className="font-medium">Preview:</p>
                <div className="border rounded-md p-2 bg-gray-50">
                  <img src={previewUrl} alt="Preview" className="max-h-64 mx-auto" />
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <Button 
                onClick={handleUpload} 
                disabled={!selectedFile || uploading}
                className="w-full"
              >
                {uploading ? "Enviando..." : "Enviar Imagem"}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleClear}
                className="w-full"
              >
                Limpar
              </Button>
            </div>

            {uploadResult && (
              <div className="mt-4 space-y-2">
                <p className="font-medium">Resultado do Upload:</p>
                <div className="border rounded-md p-4 bg-gray-50">
                  <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(uploadResult, null, 2)}</pre>
                </div>
                {uploadResult.url && (
                  <div className="space-y-2">
                    <p className="font-medium">Imagem enviada:</p>
                    <div className="border rounded-md p-2 bg-gray-50">
                      <img src={uploadResult.url} alt="Uploaded" className="max-h-64 mx-auto" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

export default UploadTest;