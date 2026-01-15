import { FileText, X, ExternalLink } from 'lucide-react';

interface ArtifactViewProps {
    artifacts: { path: string; name: string; type: string }[];
    onClose: () => void;
}

export function ArtifactView({ artifacts, onClose }: ArtifactViewProps) {


    if (artifacts.length === 0) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-background border border-border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-4 border-b border-border flex items-center justify-between">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <FileText size={20} className="text-primary" />
                        Generated Artifacts
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {artifacts.map((artifact, idx) => (
                        <div
                            key={idx}
                            className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border/50 hover:bg-secondary/50 transition-colors group"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                                    <FileText size={18} className="text-primary" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-medium truncate">{artifact.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{artifact.path}</p>
                                </div>
                            </div>
                            <div className="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => window.ipcRenderer.invoke('shell:open-path', artifact.path)}
                                    className="p-2 bg-background rounded-lg hover:bg-muted transition-colors"
                                    title="Open in Explorer"
                                >
                                    <ExternalLink size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border bg-muted/30">
                    <p className="text-sm text-muted-foreground text-center">
                        {artifacts.length} file{artifacts.length > 1 ? 's' : ''} generated
                    </p>
                </div>
            </div>
        </div>
    );
}
