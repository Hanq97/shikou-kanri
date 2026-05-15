/**
 * Graph Extractor - Regex-based entity extraction with structural inference
 * Extracts node IDs from document content using:
 *   1. Formal regex patterns (FR-*, COMP-*, ENT-*, etc.)
 *   2. Structural patterns (PascalCase services, UPPER_CASE entities)
 * Infers edges using:
 *   1. Co-occurrence within markdown sections
 *   2. Table-based mapping (Screen-API tables)
 *   3. List-based references (bullet points)
 *   4. Cross-document inference (same feature, different sections)
 */
const { NODE_TYPES } = require("./graph-schema");

// --- Exclusion sets (module-level for performance) ---

const EXCLUDED_COMPONENTS = new Set([
  "TypeScript",
  "JavaScript",
  "PostgreSQL",
  "MongoDB",
  "NestJS",
  "ReactJS",
  "NodeJS",
  "ExpressJS",
  "MaterialUI",
  "ReduxToolkit",
  "SignalR",
  "HyperledgerFabric",
  "CouchDB",
  "HttpException",
  "BadRequestException",
  "NotFoundException",
  "UnauthorizedException",
  "ForbiddenException",
  "ConflictException",
  "Injectable",
  "Controller",
  "Module",
  "Observable",
  "Promise",
  "EventEmitter",
  "AbstractService",
  "BaseController",
  "BaseRepository",
  "WebSocket",
  "HttpClient",
  "HttpService",
]);

const EXCLUDED_ENTITIES = new Set([
  "PRIMARY_KEY",
  "FOREIGN_KEY",
  "NOT_NULL",
  "UNIQUE_INDEX",
  "AUTO_INCREMENT",
  "DEFAULT_VALUE",
  "ON_DELETE",
  "ON_UPDATE",
  "CASCADE_DELETE",
  "LEFT_JOIN",
  "INNER_JOIN",
  "GROUP_BY",
  "ORDER_BY",
  "INSERT_INTO",
  "CREATE_TABLE",
  "ALTER_TABLE",
  "DROP_TABLE",
  "VARCHAR",
  "TIMESTAMP",
  "BOOLEAN",
  "HTTP_STATUS",
  "API_VERSION",
  "BASE_URL",
  "NOT_FOUND",
  "BAD_REQUEST",
  "INTERNAL_ERROR",
  "STATUS_CODE",
  "CONTENT_TYPE",
  "ACCESS_TOKEN",
  "REFRESH_TOKEN",
  "CREATED_AT",
  "UPDATED_AT",
  "DELETED_AT",
]);

class GraphExtractor {
  /**
   * Extract all nodes and inferred edges from content
   * @param {string} content - Document section content (markdown)
   * @param {string} docType - 'srs' | 'bd' | 'bdd' | 'fdd' | 'test-plan' | 'architecture' | 'adr' | 'catalog' | 'integration-pattern' | 'eps-standard' | 'eps-specialist'
   * @param {string} sectionId - Checkpoint ID (e.g., 'C2')
   * @param {string} feature - Feature code (e.g., 'LND-INVS')
   * @returns {{ nodes: object[], edges: object[] }}
   */
  extract(content, docType, sectionId, feature) {
    // Step 1: Formal regex extraction (existing)
    const formalNodes = this.extractNodes(content, docType, feature);

    // Step 2: Structural extraction (new)
    const structuralComps = this.extractStructuralComponents(content, feature);
    const structuralEnts = this.extractStructuralEntities(content, feature);

    // Step 3: Merge (formal takes priority, deduplicate by ID)
    const allNodes = this.mergeNodes(
      formalNodes,
      structuralComps,
      structuralEnts,
    );

    // Step 4: Edge inference (co-occurrence + structural)
    const coOccurEdges = this.inferEdges(allNodes, content, docType, sectionId);
    const tableEdges = this.inferTableEdges(allNodes, content);
    const listEdges = this.inferListEdges(allNodes, content);
    const crossDocEdges = this.inferCrossDocEdges(allNodes, content, docType);

    // Step 5: Merge edges (deduplicate, keep highest confidence)
    const allEdges = this.mergeEdges(
      coOccurEdges,
      tableEdges,
      listEdges,
      crossDocEdges,
    );

    return { nodes: allNodes, edges: allEdges };
  }

  /**
   * Extract node IDs from content using regex patterns
   * @param {string} content - Markdown content
   * @param {string} docType - Document type
   * @param {string} feature - Feature code
   * @returns {object[]} Array of { id, rawMatch, attributes }
   */
  extractNodes(content, docType, feature) {
    const nodes = [];
    const seen = new Set();

    for (const [typeName, typeDef] of Object.entries(NODE_TYPES)) {
      const pattern = new RegExp(typeDef.pattern.source, typeDef.pattern.flags);
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const rawMatch = match[0].trim();
        const id = this.normalizeId(rawMatch, typeName);
        if (seen.has(id)) continue;
        seen.add(id);

        const attributes = {
          type: typeName,
          feature,
          source: docType,
        };

        // Extract additional attributes from context
        if (typeName === "API") {
          const parts = rawMatch.split(/\s+/);
          attributes.method = parts[0];
          attributes.path = parts[1];
        }

        nodes.push({ id, rawMatch, attributes });
      }
    }
    return nodes;
  }

  // --- Structural Extraction ---

  /**
   * Extract components from PascalCase service names and file references
   * @param {string} content - Markdown content
   * @param {string} feature - Feature code
   * @returns {object[]} Array of { id, rawMatch, attributes }
   */
  extractStructuralComponents(content, feature) {
    const nodes = [];
    const seen = new Set();

    // Pattern 1: PascalCase names ending in known suffixes
    // Requires at least 1 PascalCase word before the suffix (e.g., PaymentGateway, LoanService)
    const servicePattern =
      /\b([A-Z][a-z]+(?:[A-Z][a-z0-9]*)*(?:Service|Controller|Repository|Gateway|Handler|Manager|Provider|Factory|Validator|Processor|Engine|Client|Adapter|Middleware|Guard|Interceptor|Resolver|Queue|Worker|Scheduler|Monitor|Observer|Listener|Emitter|Decorator|Strategy|Builder|Facade|Proxy|Wrapper))\b/g;

    let match;
    while ((match = servicePattern.exec(content)) !== null) {
      const name = match[1];
      if (this.isExcludedComponent(name)) continue;
      const id = `COMP-${name}`;
      if (seen.has(id)) continue;
      seen.add(id);
      nodes.push({
        id,
        rawMatch: name,
        attributes: { type: "Component", feature, source: "structural" },
      });
    }

    // Pattern 2: Service file references (kebab-case.service.ts)
    const filePattern =
      /\b([\w-]+)\.(?:service|controller|repository|gateway|guard)\.ts\b/g;
    while ((match = filePattern.exec(content)) !== null) {
      const kebab = match[1];
      const pascal = kebab
        .split("-")
        .map((s) => s[0].toUpperCase() + s.slice(1))
        .join("");
      const id = `COMP-${pascal}`;
      if (seen.has(id)) continue;
      seen.add(id);
      nodes.push({
        id,
        rawMatch: match[0],
        attributes: { type: "Component", feature, source: "structural" },
      });
    }

    return nodes;
  }

  /**
   * Extract entities from UPPER_CASE names in data model sections
   * @param {string} content - Markdown content
   * @param {string} feature - Feature code
   * @returns {object[]} Array of { id, rawMatch, attributes }
   */
  extractStructuralEntities(content, feature) {
    const nodes = [];
    const seen = new Set();

    const dataSection = this.extractDataSection(content);
    if (!dataSection) return nodes;

    // Pattern: UPPER_CASE_NAMES (2+ words separated by underscore)
    const entityPattern = /\b([A-Z][A-Z_]{2,}(?:_[A-Z]+)+)\b/g;

    let match;
    while ((match = entityPattern.exec(dataSection)) !== null) {
      const name = match[1];
      if (this.isExcludedEntity(name)) continue;
      const id = `ENT-${this.toPascalCase(name)}`;
      if (seen.has(id)) continue;
      seen.add(id);
      nodes.push({
        id,
        rawMatch: name,
        attributes: { type: "Entity", feature, source: "structural" },
      });
    }

    return nodes;
  }

  // --- Edge Inference (co-occurrence based) ---

  /**
   * Infer edges based on co-occurrence and document type
   * @param {object[]} nodes - Extracted nodes
   * @param {string} content - Document content
   * @param {string} docType - Document type
   * @param {string} sectionId - Checkpoint ID
   * @returns {object[]} Array of { source, target, attributes }
   */
  inferEdges(nodes, content, docType, sectionId) {
    switch (docType) {
      case "bd":
        return this.inferBDEdges(nodes, content);
      case "bdd":
        return this.inferBDDEdges(nodes, content);
      case "fdd":
        return this.inferFDDEdges(nodes, content);
      case "test-plan":
        return this.inferTestEdges(nodes, content);
      case "srs":
        return this.inferSRSEdges(nodes, content);
      case "source-code":
        return this.inferSourceCodeEdges(nodes);
      case "architecture":
        return this.inferArchitectureEdges(nodes, content);
      case "adr":
        return this.inferADREdges(nodes, content);
      case "catalog":
        return this.inferCatalogEdges(nodes, content);
      case "integration-pattern":
        return this.inferIntegrationEdges(nodes, content);
      case "eps-standard":
      case "eps-specialist":
        return this.inferEPSEdges(nodes, content);
      default:
        return [];
    }
  }

  /**
   * BD document: Component IMPLEMENTS Requirement, NFR CONSTRAINS Component, Entity PERSISTS Component
   */
  inferBDEdges(nodes, content) {
    const edges = [];
    const comps = nodes.filter((n) => n.attributes.type === "Component");
    const frs = nodes.filter((n) => n.attributes.type === "Requirement");
    const nfrs = nodes.filter((n) => n.attributes.type === "NFRequirement");
    const entities = nodes.filter((n) => n.attributes.type === "Entity");

    // COMP -> FR: IMPLEMENTS
    for (const comp of comps) {
      for (const fr of frs) {
        if (
          this.coOccursInSection(
            this.getSearchText(comp),
            this.getSearchText(fr),
            content,
          )
        ) {
          edges.push({
            source: comp.id,
            target: fr.id,
            attributes: { type: "IMPLEMENTS", confidence: 0.85, source: "bd" },
          });
        }
      }
    }

    // NFR -> COMP: CONSTRAINS
    for (const nfr of nfrs) {
      for (const comp of comps) {
        if (
          this.coOccursInSection(
            this.getSearchText(nfr),
            this.getSearchText(comp),
            content,
          )
        ) {
          edges.push({
            source: nfr.id,
            target: comp.id,
            attributes: { type: "CONSTRAINS", confidence: 0.8, source: "bd" },
          });
        }
      }
    }

    // ENT -> COMP: PERSISTS
    for (const entity of entities) {
      for (const comp of comps) {
        if (
          this.coOccursInSection(
            this.getSearchText(entity),
            this.getSearchText(comp),
            content,
          )
        ) {
          edges.push({
            source: entity.id,
            target: comp.id,
            attributes: { type: "PERSISTS", confidence: 0.8, source: "bd" },
          });
        }
      }
    }

    return edges;
  }

  /**
   * BDD document: API EXPOSES Component, TestCase VALIDATES API
   */
  inferBDDEdges(nodes, content) {
    const edges = [];
    const apis = nodes.filter((n) => n.attributes.type === "API");
    const comps = nodes.filter((n) => n.attributes.type === "Component");
    const tests = nodes.filter((n) => n.attributes.type === "TestCase");

    // API -> COMP: EXPOSES
    for (const api of apis) {
      for (const comp of comps) {
        if (
          this.coOccursInSection(
            this.getSearchText(api),
            this.getSearchText(comp),
            content,
          )
        ) {
          edges.push({
            source: api.id,
            target: comp.id,
            attributes: { type: "EXPOSES", confidence: 0.9, source: "bdd" },
          });
        }
      }
    }

    // TEST -> API: VALIDATES
    for (const test of tests) {
      for (const api of apis) {
        if (
          this.coOccursInSection(
            this.getSearchText(test),
            this.getSearchText(api),
            content,
          )
        ) {
          edges.push({
            source: test.id,
            target: api.id,
            attributes: { type: "VALIDATES", confidence: 0.85, source: "bdd" },
          });
        }
      }
    }

    return edges;
  }

  /**
   * FDD document: Screen DISPLAYS Requirement, Screen USES API
   */
  inferFDDEdges(nodes, content) {
    const edges = [];
    const screens = nodes.filter((n) => n.attributes.type === "Screen");
    const frs = nodes.filter((n) => n.attributes.type === "Requirement");
    const apis = nodes.filter((n) => n.attributes.type === "API");

    // SCR -> FR: DISPLAYS
    for (const scr of screens) {
      for (const fr of frs) {
        if (
          this.coOccursInSection(
            this.getSearchText(scr),
            this.getSearchText(fr),
            content,
          )
        ) {
          edges.push({
            source: scr.id,
            target: fr.id,
            attributes: { type: "DISPLAYS", confidence: 0.85, source: "fdd" },
          });
        }
      }
    }

    // SCR -> API: USES
    for (const scr of screens) {
      for (const api of apis) {
        if (
          this.coOccursInSection(
            this.getSearchText(scr),
            this.getSearchText(api),
            content,
          )
        ) {
          edges.push({
            source: scr.id,
            target: api.id,
            attributes: { type: "USES", confidence: 0.8, source: "fdd" },
          });
        }
      }
    }

    return edges;
  }

  /**
   * Test Plan: TestCase TESTS Requirement
   */
  inferTestEdges(nodes, content) {
    const edges = [];
    const tests = nodes.filter((n) => n.attributes.type === "TestCase");
    const frs = nodes.filter((n) => n.attributes.type === "Requirement");

    for (const test of tests) {
      for (const fr of frs) {
        if (
          this.coOccursInSection(
            this.getSearchText(test),
            this.getSearchText(fr),
            content,
          )
        ) {
          edges.push({
            source: test.id,
            target: fr.id,
            attributes: { type: "TESTS", confidence: 0.9, source: "test-plan" },
          });
        }
      }
    }

    return edges;
  }

  /**
   * SRS document: Requirement DEPENDS_ON Requirement
   */
  inferSRSEdges(nodes, content) {
    const edges = [];

    // Look for explicit dependency patterns
    const depPattern =
      /(?:Dependencies|Phụ thuộc|依存):\s*(FR-[A-Z]{2,4}-[A-Z]{2,5}-\d{3}(?:\s*,\s*FR-[A-Z]{2,4}-[A-Z]{2,5}-\d{3})*)/g;
    let match;
    while ((match = depPattern.exec(content)) !== null) {
      const deps = match[1].split(",").map((s) => s.trim());
      // Find which FR this dependency block belongs to (look backward for FR ID)
      const contextBefore = content.substring(
        Math.max(0, match.index - 300),
        match.index,
      );
      const frMatches = [
        ...contextBefore.matchAll(/FR-[A-Z]{2,4}-[A-Z]{2,5}-\d{3}/g),
      ];
      const frMatch =
        frMatches.length > 0 ? frMatches[frMatches.length - 1] : null;
      if (frMatch) {
        for (const dep of deps) {
          if (dep !== frMatch[0]) {
            edges.push({
              source: frMatch[0],
              target: dep,
              attributes: {
                type: "DEPENDS_ON",
                confidence: 1.0,
                source: "srs",
              },
            });
          }
        }
      }
    }

    return edges;
  }

  // ═══════════════════════════════════════════════════════════════
  // ARCHITECTURE EDGE INFERENCE
  // ═══════════════════════════════════════════════════════════════

  /**
   * Architecture document: Service INTEGRATES_WITH Service, Service references components
   */
  inferArchitectureEdges(nodes, content) {
    const edges = [];
    const comps = nodes.filter((n) => n.attributes.type === "Component");
    const apis = nodes.filter((n) => n.attributes.type === "API");
    const adrs = nodes.filter((n) => n.attributes.type === "ADR");
    const entities = nodes.filter((n) => n.attributes.type === "Entity");

    // COMP → COMP: INTEGRATES_WITH (co-occurrence in same section)
    for (let i = 0; i < comps.length; i++) {
      for (let j = i + 1; j < comps.length; j++) {
        if (
          this.coOccursInSection(
            this.getSearchText(comps[i]),
            this.getSearchText(comps[j]),
            content,
          )
        ) {
          edges.push({
            source: comps[i].id,
            target: comps[j].id,
            attributes: {
              type: "INTEGRATES_WITH",
              confidence: 0.75,
              source: "architecture",
            },
          });
        }
      }
    }

    // COMP → ADR: GOVERNED_BY
    for (const comp of comps) {
      for (const adr of adrs) {
        if (
          this.coOccursInSection(
            this.getSearchText(comp),
            this.getSearchText(adr),
            content,
          )
        ) {
          edges.push({
            source: comp.id,
            target: adr.id,
            attributes: {
              type: "GOVERNED_BY",
              confidence: 0.8,
              source: "architecture",
            },
          });
        }
      }
    }

    // API → COMP: USES (co-occurrence)
    for (const api of apis) {
      for (const comp of comps) {
        if (
          this.coOccursInSection(
            this.getSearchText(api),
            this.getSearchText(comp),
            content,
          )
        ) {
          edges.push({
            source: api.id,
            target: comp.id,
            attributes: {
              type: "USES",
              confidence: 0.7,
              source: "architecture",
            },
          });
        }
      }
    }

    // ADR → ADR: REFERENCES (co-occurrence)
    for (let i = 0; i < adrs.length; i++) {
      for (let j = i + 1; j < adrs.length; j++) {
        if (
          this.coOccursInSection(
            this.getSearchText(adrs[i]),
            this.getSearchText(adrs[j]),
            content,
          )
        ) {
          edges.push({
            source: adrs[i].id,
            target: adrs[j].id,
            attributes: {
              type: "REFERENCES",
              confidence: 0.7,
              source: "architecture",
            },
          });
        }
      }
    }

    // ENT → COMP: USES (entity referenced near component)
    for (const ent of entities) {
      for (const comp of comps) {
        if (
          this.coOccursInSection(
            this.getSearchText(ent),
            this.getSearchText(comp),
            content,
          )
        ) {
          edges.push({
            source: comp.id,
            target: ent.id,
            attributes: {
              type: "USES",
              confidence: 0.65,
              source: "architecture",
            },
          });
        }
      }
    }

    return edges;
  }

  /**
   * ADR document: ADR SUPERSEDES ADR, ADR GOVERNED_BY services/components
   */
  inferADREdges(nodes, content) {
    const edges = [];
    const adrs = nodes.filter((n) => n.attributes.type === "ADR");
    const comps = nodes.filter((n) => n.attributes.type === "Component");
    const apis = nodes.filter((n) => n.attributes.type === "API");
    const entities = nodes.filter((n) => n.attributes.type === "Entity");

    // ADR → ADR: SUPERSEDES (explicit "Supersedes" pattern)
    const supersedesPattern =
      /(?:Supersedes|supersedes|取り替え|thay thế)[\s:]*\s*(ADR-\d{3})/g;
    let match;
    while ((match = supersedesPattern.exec(content)) !== null) {
      const targetAdr = match[1];
      const headerMatch = content.match(/^#[^#].*?(ADR-\d{3})/m);
      if (headerMatch && headerMatch[1] !== targetAdr) {
        edges.push({
          source: headerMatch[1],
          target: targetAdr,
          attributes: { type: "SUPERSEDES", confidence: 1.0, source: "adr" },
        });
      }
    }

    // COMP/API/ENT → ADR: GOVERNED_BY (co-occurrence)
    for (const node of [...comps, ...apis, ...entities]) {
      for (const adr of adrs) {
        if (
          this.coOccursInSection(
            this.getSearchText(node),
            this.getSearchText(adr),
            content,
          )
        ) {
          edges.push({
            source: node.id,
            target: adr.id,
            attributes: {
              type: "GOVERNED_BY",
              confidence: 0.85,
              source: "adr",
            },
          });
        }
      }
    }

    // ADR → ADR: REFERENCES (co-occurrence)
    for (let i = 0; i < adrs.length; i++) {
      for (let j = i + 1; j < adrs.length; j++) {
        if (
          this.coOccursInSection(
            this.getSearchText(adrs[i]),
            this.getSearchText(adrs[j]),
            content,
          )
        ) {
          edges.push({
            source: adrs[i].id,
            target: adrs[j].id,
            attributes: { type: "REFERENCES", confidence: 0.75, source: "adr" },
          });
        }
      }
    }

    return edges;
  }

  /**
   * Catalog document: Service PUBLISHES/SUBSCRIBES DomainEvent
   */
  inferCatalogEdges(nodes, content) {
    const edges = [];
    const comps = nodes.filter((n) => n.attributes.type === "Component");
    const apis = nodes.filter((n) => n.attributes.type === "API");
    const catalogs = nodes.filter((n) => n.attributes.type === "Catalog");
    const events = nodes.filter((n) =>
      ["DomainEvent", "Event"].includes(n.attributes.type),
    );
    const entities = nodes.filter((n) => n.attributes.type === "Entity");

    // SVC/COMP → DomainEvent: PUBLISHES (look for publisher patterns)
    const publishPattern =
      /(?:Publisher|publish|発行|phát hành)[\s:]*[^|\n]*?(SVC-[A-Z][A-Za-z0-9-]+|COMP-[A-Z][A-Za-z]+)/gi;
    let match;
    while ((match = publishPattern.exec(content)) !== null) {
      const publisherId = match[1];
      // Find events in same section
      const sectionStart = content.lastIndexOf("##", match.index);
      const sectionEnd = content.indexOf("##", match.index + 1);
      const section = content.substring(
        sectionStart >= 0 ? sectionStart : 0,
        sectionEnd >= 0 ? sectionEnd : content.length,
      );
      for (const evt of events) {
        if (section.includes(evt.rawMatch || evt.id)) {
          edges.push({
            source: publisherId,
            target: evt.id,
            attributes: {
              type: "PUBLISHES",
              confidence: 0.85,
              source: "catalog",
            },
          });
        }
      }
    }

    // SVC/COMP → DomainEvent: SUBSCRIBES (look for subscriber patterns)
    const subPattern =
      /(?:Subscriber|subscribe|購読|đăng ký)[\s:]*[^|\n]*?(SVC-[A-Z][A-Za-z0-9-]+|COMP-[A-Z][A-Za-z]+)/gi;
    while ((match = subPattern.exec(content)) !== null) {
      const subscriberId = match[1];
      const sectionStart = content.lastIndexOf("##", match.index);
      const sectionEnd = content.indexOf("##", match.index + 1);
      const section = content.substring(
        sectionStart >= 0 ? sectionStart : 0,
        sectionEnd >= 0 ? sectionEnd : content.length,
      );
      for (const evt of events) {
        if (section.includes(evt.rawMatch || evt.id)) {
          edges.push({
            source: subscriberId,
            target: evt.id,
            attributes: {
              type: "SUBSCRIBES",
              confidence: 0.85,
              source: "catalog",
            },
          });
        }
      }
    }

    // Fallback: co-occurrence based for comps/entities + events
    for (const node of [...comps, ...entities]) {
      for (const evt of events) {
        if (
          this.coOccursInSection(
            this.getSearchText(node),
            this.getSearchText(evt),
            content,
          )
        ) {
          const key1 = `${node.id}→${evt.id}→PUBLISHES`;
          const key2 = `${node.id}→${evt.id}→SUBSCRIBES`;
          const hasExplicit = edges.some(
            (e) =>
              `${e.source}→${e.target}→${e.attributes.type}` === key1 ||
              `${e.source}→${e.target}→${e.attributes.type}` === key2,
          );
          if (!hasExplicit) {
            edges.push({
              source: node.id,
              target: evt.id,
              attributes: {
                type: "PUBLISHES",
                confidence: 0.6,
                source: "catalog-cooccur",
              },
            });
          }
        }
      }
    }

    // Catalog → Entity/Comp: REFERENCES (co-occurrence)
    for (const cat of catalogs) {
      for (const target of [...entities, ...comps, ...apis]) {
        if (
          this.coOccursInSection(
            this.getSearchText(cat),
            this.getSearchText(target),
            content,
          )
        ) {
          edges.push({
            source: cat.id,
            target: target.id,
            attributes: {
              type: "REFERENCES",
              confidence: 0.65,
              source: "catalog",
            },
          });
        }
      }
    }

    return edges;
  }

  /**
   * Integration spec: Service INTEGRATES_WITH Service
   */
  inferIntegrationEdges(nodes, content) {
    const edges = [];
    const comps = nodes.filter((n) => n.attributes.type === "Component");
    const apis = nodes.filter((n) => n.attributes.type === "API");

    // COMP → COMP: INTEGRATES_WITH (all component pairs in integration doc)
    for (let i = 0; i < comps.length; i++) {
      for (let j = i + 1; j < comps.length; j++) {
        edges.push({
          source: comps[i].id,
          target: comps[j].id,
          attributes: {
            type: "INTEGRATES_WITH",
            confidence: 0.9,
            source: "integration-pattern",
          },
        });
      }
    }

    // API → COMP: USES (co-occurrence in integration docs)
    for (const api of apis) {
      for (const comp of comps) {
        if (
          this.coOccursInSection(
            this.getSearchText(api),
            this.getSearchText(comp),
            content,
          )
        ) {
          edges.push({
            source: api.id,
            target: comp.id,
            attributes: {
              type: "USES",
              confidence: 0.8,
              source: "integration-pattern",
            },
          });
        }
      }
    }

    return edges;
  }

  // ═══════════════════════════════════════════════════════════════
  // EPS KNOWLEDGE EDGE INFERENCE
  // ═══════════════════════════════════════════════════════════════

  /**
   * EPS docs: EPSPhase GUIDES EPSPhase, EPSPhase PHASE_USES EPSAgent
   */
  inferEPSEdges(nodes, content) {
    const edges = [];
    const phases = nodes.filter((n) => n.attributes.type === "EPSPhase");
    const agents = nodes.filter((n) => n.attributes.type === "EPSAgent");

    // PHASE → AGENT: PHASE_USES (co-occurrence)
    for (const phase of phases) {
      for (const agent of agents) {
        if (
          this.coOccursInSection(
            this.getSearchText(phase),
            this.getSearchText(agent),
            content,
          )
        ) {
          edges.push({
            source: phase.id,
            target: agent.id,
            attributes: { type: "PHASE_USES", confidence: 0.8, source: "eps" },
          });
        }
      }
    }

    // PHASE → PHASE: GUIDES (sequential phases in ordered list)
    if (phases.length > 1) {
      const sorted = [...phases].sort((a, b) => a.id.localeCompare(b.id));
      for (let i = 0; i < sorted.length - 1; i++) {
        edges.push({
          source: sorted[i].id,
          target: sorted[i + 1].id,
          attributes: { type: "GUIDES", confidence: 0.7, source: "eps" },
        });
      }
    }

    return edges;
  }

  /**
   * Source code: Class REALIZES Component, Class DEFINED_IN SourceFile, IMPORTS between files.
   * Uses source-extractor for AST-light extraction.
   */
  inferSourceCodeEdges(nodes) {
    const edges = [];

    const classes = nodes.filter((n) => n.attributes.type === "Class");
    const srcFiles = nodes.filter((n) => n.attributes.type === "SourceFile");
    const comps = nodes.filter((n) => n.attributes.type === "Component");

    // CLS → COMP: REALIZES (by name match)
    for (const cls of classes) {
      const className = cls.id.replace("CLS-", "");
      for (const comp of comps) {
        const compName = comp.id.replace("COMP-", "");
        if (className === compName) {
          edges.push({
            source: cls.id,
            target: comp.id,
            attributes: {
              type: "REALIZES",
              confidence: 0.95,
              source: "source-code",
            },
          });
        }
      }
    }

    // CLS → SRC: DEFINED_IN (by filePath match)
    for (const cls of classes) {
      const clsFilePath = cls.attributes.filePath;
      if (!clsFilePath) continue;
      for (const src of srcFiles) {
        const srcPath = src.attributes.filePath || src.id.replace("SRC-", "");
        if (clsFilePath === srcPath) {
          edges.push({
            source: cls.id,
            target: src.id,
            attributes: {
              type: "DEFINED_IN",
              confidence: 1.0,
              source: "source-code",
            },
          });
        }
      }
    }

    return edges;
  }

  // --- Structural Edge Inference ---

  /**
   * Infer edges from markdown tables (Screen-API mapping, Component-FR mapping)
   * @param {object[]} nodes - All extracted nodes
   * @param {string} content - Document content
   * @returns {object[]} Inferred edges
   */
  inferTableEdges(nodes, content) {
    const edges = [];

    // Find markdown tables (header + separator + body rows)
    const tablePattern = /\|[^\n]*\|\n\|[-|\s:]+\|\n((?:\|[^\n]*\|\n?)*)/g;
    let tableMatch;
    while ((tableMatch = tablePattern.exec(content)) !== null) {
      const rows = tableMatch[1]
        .split("\n")
        .filter((r) => r.trim() && r.includes("|"));
      for (const row of rows) {
        const cells = row
          .split("|")
          .map((c) => c.trim())
          .filter(Boolean);
        const cellText = cells.join(" ");

        // Screen + API in same row → USES
        const screenNodes = nodes.filter(
          (n) =>
            n.attributes.type === "Screen" &&
            cellText.includes(n.rawMatch || n.id),
        );
        const apiNodes = nodes.filter(
          (n) =>
            n.attributes.type === "API" &&
            cells.some((c) => c.includes(n.rawMatch || n.id)),
        );
        for (const scr of screenNodes) {
          for (const api of apiNodes) {
            edges.push({
              source: scr.id,
              target: api.id,
              attributes: { type: "USES", confidence: 0.95, source: "table" },
            });
          }
        }

        // Component + FR in same row → IMPLEMENTS
        const compNodes = nodes.filter(
          (n) =>
            n.attributes.type === "Component" &&
            cellText.includes(n.rawMatch || n.id),
        );
        const frNodes = nodes.filter(
          (n) =>
            n.attributes.type === "Requirement" &&
            cellText.includes(n.rawMatch || n.id),
        );
        for (const comp of compNodes) {
          for (const fr of frNodes) {
            edges.push({
              source: comp.id,
              target: fr.id,
              attributes: {
                type: "IMPLEMENTS",
                confidence: 0.9,
                source: "table",
              },
            });
          }
        }

        // TestCase + FR in same row → TESTS
        const testNodes = nodes.filter(
          (n) =>
            n.attributes.type === "TestCase" &&
            cellText.includes(n.rawMatch || n.id),
        );
        for (const test of testNodes) {
          for (const fr of frNodes) {
            edges.push({
              source: test.id,
              target: fr.id,
              attributes: { type: "TESTS", confidence: 0.95, source: "table" },
            });
          }
        }
      }
    }
    return edges;
  }

  /**
   * Infer edges from bullet lists referencing multiple node types
   * @param {object[]} nodes - All extracted nodes
   * @param {string} content - Document content
   * @returns {object[]} Inferred edges
   */
  inferListEdges(nodes, content) {
    const edges = [];
    const bullets = content.match(/^[\s]*[-*]\s+.+$/gm) || [];

    for (const bullet of bullets) {
      const compNodes = nodes.filter(
        (n) =>
          n.attributes.type === "Component" &&
          bullet.includes(n.rawMatch || n.id),
      );
      const frNodes = nodes.filter(
        (n) =>
          n.attributes.type === "Requirement" &&
          bullet.includes(n.rawMatch || n.id),
      );

      // Component + FR in same bullet → IMPLEMENTS
      for (const comp of compNodes) {
        for (const fr of frNodes) {
          edges.push({
            source: comp.id,
            target: fr.id,
            attributes: {
              type: "IMPLEMENTS",
              confidence: 0.75,
              source: "list",
            },
          });
        }
      }
    }

    return edges;
  }

  /**
   * Infer cross-document edges (nodes in same document but different sections)
   * Lower confidence since they don't co-occur in the same section.
   * @param {object[]} nodes - All extracted nodes
   * @param {string} content - Document content
   * @param {string} docType - Document type
   * @returns {object[]} Inferred edges
   */
  inferCrossDocEdges(nodes, content, docType) {
    const edges = [];
    if (docType !== "bd") return edges;

    const comps = nodes.filter((n) => n.attributes.type === "Component");
    const frs = nodes.filter((n) => n.attributes.type === "Requirement");

    for (const comp of comps) {
      for (const fr of frs) {
        // Skip if already co-occur in same section (handled by inferBDEdges)
        if (
          this.coOccursInSection(
            this.getSearchText(comp),
            this.getSearchText(fr),
            content,
          )
        ) {
          continue;
        }
        // Both exist in same BD document = weak IMPLEMENTS
        edges.push({
          source: comp.id,
          target: fr.id,
          attributes: {
            type: "IMPLEMENTS",
            confidence: 0.5,
            source: "cross-doc",
          },
        });
      }
    }

    return edges;
  }

  // --- Merge Helpers ---

  /**
   * Merge multiple node arrays, deduplicating by ID (first occurrence wins)
   * @param {...object[]} nodeSets - Arrays of nodes
   * @returns {object[]} Merged nodes
   */
  mergeNodes(...nodeSets) {
    const byId = new Map();
    for (const nodes of nodeSets) {
      for (const node of nodes) {
        if (!byId.has(node.id)) {
          byId.set(node.id, node);
        }
      }
    }
    return [...byId.values()];
  }

  /**
   * Merge multiple edge arrays, deduplicating by source+target+type (highest confidence wins)
   * @param {...object[]} edgeSets - Arrays of edges
   * @returns {object[]} Merged edges
   */
  mergeEdges(...edgeSets) {
    const byKey = new Map();
    for (const edges of edgeSets) {
      for (const edge of edges) {
        const k = `${edge.source}\u2192${edge.target}\u2192${edge.attributes.type}`;
        const existing = byKey.get(k);
        if (
          !existing ||
          edge.attributes.confidence > existing.attributes.confidence
        ) {
          byKey.set(k, edge);
        }
      }
    }
    return [...byKey.values()];
  }

  // --- Helpers ---

  /**
   * Check if two text values co-occur within the same markdown section (## heading)
   * @param {string} text1 - Text to search (raw match or ID)
   * @param {string} text2 - Text to search (raw match or ID)
   * @param {string} content
   * @returns {boolean}
   */
  coOccursInSection(text1, text2, content) {
    const sections = content.split(/^##\s+/m);
    return sections.some(
      (section) => section.includes(text1) && section.includes(text2),
    );
  }

  /**
   * Get the searchable text for a node (rawMatch for content matching)
   * @param {object} node - { id, rawMatch, attributes }
   * @returns {string}
   */
  getSearchText(node) {
    return node.rawMatch || node.id;
  }

  /**
   * Normalize extracted ID (trim whitespace, standardize format)
   * @param {string} rawId
   * @param {string} typeName
   * @returns {string}
   */
  normalizeId(rawId, typeName) {
    const trimmed = rawId.trim();
    if (typeName === "API") {
      const parts = trimmed.split(/\s+/);
      return `API-${parts[0]}-${parts[1]}`;
    }
    return trimmed;
  }

  /**
   * Check if a PascalCase name should be excluded from component extraction
   * @param {string} name - PascalCase name
   * @returns {boolean}
   */
  isExcludedComponent(name) {
    return EXCLUDED_COMPONENTS.has(name) || name.length < 5;
  }

  /**
   * Check if an UPPER_CASE name should be excluded from entity extraction
   * @param {string} name - UPPER_CASE_NAME
   * @returns {boolean}
   */
  isExcludedEntity(name) {
    return (
      EXCLUDED_ENTITIES.has(name) ||
      name.split("_").length < 2 ||
      name.length < 5
    );
  }

  /**
   * Extract data-model related sections from content
   * @param {string} content - Full markdown content
   * @returns {string|null} Concatenated data sections or null
   */
  extractDataSection(content) {
    const sections = [];

    // Split by ## headings and check each for data-related keywords
    const parts = content.split(/^(#{2,3}\s+[^\n]*)/m);
    for (let i = 1; i < parts.length; i += 2) {
      const heading = parts[i];
      const body = parts[i + 1] || "";
      if (
        /(?:Data|Entity|ER|Database|Schema|Model|テーブル|エンティティ|データモデル|Bảng|Thực thể)/i.test(
          heading,
        )
      ) {
        sections.push(body);
      }
    }

    return sections.length > 0 ? sections.join("\n") : null;
  }

  /**
   * Convert UPPER_SNAKE_CASE to PascalCase
   * @param {string} upperSnake - e.g., 'LOAN_APPLICATION'
   * @returns {string} e.g., 'LoanApplication'
   */
  toPascalCase(upperSnake) {
    return upperSnake
      .split("_")
      .map((w) => w[0] + w.slice(1).toLowerCase())
      .join("");
  }
}

module.exports = GraphExtractor;
