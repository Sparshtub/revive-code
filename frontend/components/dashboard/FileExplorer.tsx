import React, { useState } from 'react';

interface FileExplorerProps {
    files: string[];
    onSelectFile: (filePath: string) => void;
    activeFile: string | null;
}

interface TreeNode {
    name: string;
    path: string;
    isFolder: boolean;
    children: Record<string, TreeNode>;
}

export default function FileExplorer({ files, onSelectFile, activeFile }: FileExplorerProps) {
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
        'root': true
    });

    const toggleFolder = (folderPath: string) => {
        setExpandedFolders(prev => ({
            ...prev,
            [folderPath]: !prev[folderPath]
        }));
    };

    // Convert flat file list to nested object tree
    const buildTree = (paths: string[]): Record<string, TreeNode> => {
        const root: Record<string, TreeNode> = {};
        
        paths.forEach(path => {
            const parts = path.split('/');
            let current = root;
            let currentPath = '';
            
            parts.forEach((part, index) => {
                currentPath = currentPath ? `${currentPath}/${part}` : part;
                const isLast = index === parts.length - 1;
                
                if (!current[part]) {
                    current[part] = {
                        name: part,
                        path: currentPath,
                        isFolder: !isLast,
                        children: {}
                    };
                }
                
                current = current[part].children;
            });
        });
        
        return root;
    };

    const tree = buildTree(files);

    const renderTreeNodes = (nodes: Record<string, TreeNode>, depth = 0) => {
        const sortedNodeKeys = Object.keys(nodes).sort((a, b) => {
            // Folders first, then alphabetical
            if (nodes[a].isFolder && !nodes[b].isFolder) return -1;
            if (!nodes[a].isFolder && nodes[b].isFolder) return 1;
            return a.localeCompare(b);
        });

        return sortedNodeKeys.map(key => {
            const node = nodes[key];
            const isExpanded = expandedFolders[node.path] !== false; // expanded by default
            const isActive = activeFile === node.path;
            
            if (node.isFolder) {
                return (
                    <div key={node.path} style={{ marginLeft: `${depth * 6}px` }} className="font-sans text-xs">
                        <div
                            onClick={() => toggleFolder(node.path)}
                            className="flex items-center gap-1.5 py-1 px-2 hover:bg-surface-dark-elevated rounded-sm cursor-pointer select-none text-on-dark-soft hover:text-on-dark font-medium"
                        >
                            <span className="text-[10px] text-muted-soft w-3 text-center">
                                {isExpanded ? '▼' : '▶'}
                            </span>
                            <span className="text-sm">📁</span>
                            <span className="truncate">{node.name}</span>
                        </div>
                        {isExpanded && (
                            <div className="border-l border-hairline/5 ml-3.5 pl-1.5 mt-0.5 space-y-0.5">
                                {renderTreeNodes(node.children, depth + 1)}
                            </div>
                        )}
                    </div>
                );
            } else {
                return (
                    <div
                        key={node.path}
                        style={{ marginLeft: `${depth * 6 + 14}px` }}
                        onClick={() => onSelectFile(node.path)}
                        className={`flex items-center gap-2 py-1.5 px-2.5 rounded-sm cursor-pointer select-none font-sans text-xs transition-colors ${
                            isActive 
                                ? 'bg-primary/10 text-primary font-semibold border-l-2 border-primary' 
                                : 'text-on-dark-soft hover:text-on-dark hover:bg-surface-dark-elevated'
                        }`}
                    >
                        <span>📄</span>
                        <span className="truncate" title={node.path}>{node.name}</span>
                    </div>
                );
            }
        });
    };

    return (
        <div className="bg-surface-dark text-on-dark p-4 border border-hairline/10 rounded-lg h-full overflow-y-auto max-h-[500px]">
            <div className="flex items-center gap-2 border-b border-hairline/5 pb-2.5 mb-3">
                <span className="text-xs">📂</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-on-dark-soft">Workspace Explorer</span>
            </div>
            <div className="space-y-1">
                {files.length === 0 ? (
                    <p className="text-xs text-muted py-4 text-center">No files to display</p>
                ) : (
                    renderTreeNodes(tree)
                )}
            </div>
        </div>
    );
}
