import os
from tree_sitter import Language, Parser
import tree_sitter_python as tspython
import tree_sitter_javascript as tsjavascript
import tree_sitter_typescript as tstypescript

class CodeParser:
    def __init__(self):
        self.parsers = {}
        self.cache = {}  # Hashing cache: md5 -> parsed_data
        
        # Initialize languages
        try:
            self.py_lang = Language(tspython.language())
            self.js_lang = Language(tsjavascript.language())
            self.ts_lang = Language(tstypescript.language_typescript())
            self.tsx_lang = Language(tstypescript.language_tsx())
            
            self._setup_parser('.py', self.py_lang)
            self._setup_parser('.js', self.js_lang)
            self._setup_parser('.jsx', self.js_lang)
            self._setup_parser('.ts', self.ts_lang)
            self._setup_parser('.tsx', self.tsx_lang)
        except Exception as e:
            print(f"Failed to initialize tree-sitter languages: {e}")

    def _setup_parser(self, ext: str, lang: Language):
        parser = Parser()
        parser.language = lang
        self.parsers[ext] = parser

    def parse_file(self, filepath: str):
        ext = os.path.splitext(filepath)[1]
        if ext not in self.parsers:
            return None
            
        try:
            with open(filepath, 'rb') as f:
                code = f.read()
        except Exception as e:
            print(f"Error reading file {filepath}: {e}")
            return None
            
        import hashlib
        code_hash = hashlib.md5(code).hexdigest()
        
        # Quick Cache Hit
        if code_hash in self.cache:
            return self.cache[code_hash]
            
        tree = self.parsers[ext].parse(code)
        
        functions = []
        classes = []
        imports = []
        
        # Non-recursive, ultra-fast stack traversal
        stack = [tree.root_node]
        while stack:
            node = stack.pop()
            
            if node.type in {'function_definition', 'method_definition', 'function_declaration'}:
                for child in node.children:
                    if child.type == 'identifier':
                        functions.append(child.text.decode('utf8'))
                        break
            elif node.type in {'class_definition', 'class_declaration'}:
                for child in node.children:
                    if child.type == 'identifier':
                        classes.append(child.text.decode('utf8'))
                        break
            elif node.type in {'import_statement', 'import_from_statement', 'import_declaration'}:
                imports.append(node.text.decode('utf8'))
                
            stack.extend(node.children)
            
        result = {
            "functions": functions,
            "classes": classes,
            "imports": imports,
            "size": len(code)
        }
        
        self.cache[code_hash] = result
        return result

    def walk_directory(self, directory: str):
        graph_nodes = {}
        for root, dirs, files in os.walk(directory):
            # Prune directories we don't want to walk
            dirs[:] = [d for d in dirs if d not in {
                '.git', 'node_modules', 'venv', '.venv', '__pycache__', 
                '.next', 'dist', 'build', 'out', 'coverage', '.github', 
                '.vscode', '.idea', '.expo', 'bower_components'
            }]
            for file in files:
                filepath = os.path.join(root, file)
                relpath = os.path.relpath(filepath, directory)
                parsed_data = self.parse_file(filepath)
                if parsed_data:
                    graph_nodes[relpath] = parsed_data
        return graph_nodes
