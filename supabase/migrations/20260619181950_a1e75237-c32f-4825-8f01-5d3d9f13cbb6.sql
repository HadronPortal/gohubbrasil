-- Canonicalize service_catalog names by slug to avoid mojibake and ensure UTF-8.
-- Idempotent: only updates rows whose name differs from canonical.
WITH canon(slug, name) AS (
  VALUES
    ('drenagem-linfatica', 'Drenagem linfática'),
    ('massagem-relaxante', 'Massagem relaxante'),
    ('massagem-terapeutica', 'Massagem terapêutica'),
    ('massagem-desportiva', 'Massagem desportiva'),
    ('pedras-quentes', 'Pedras quentes'),
    ('auriculoterapia', 'Auriculoterapia'),
    ('ventosaterapia', 'Ventosaterapia'),
    ('reflexologia-massoterapia', 'Reflexologia'),
    ('pigmentacao', 'Pigmentação'),
    ('coloracao', 'Coloração'),
    ('hidratacao', 'Hidratação'),
    ('micropigmentacao', 'Micropigmentação'),
    ('depilacao-intima', 'Depilação íntima'),
    ('extensao-de-cilios', 'Extensão de cílios'),
    ('spa-dos-pes', 'Spa dos pés')
)
UPDATE public.service_catalog sc
SET name = c.name, updated_at = now()
FROM canon c
WHERE sc.slug = c.slug AND sc.name IS DISTINCT FROM c.name;

-- For massoterapia category, force drenagem-linfatica row to use the massage-specific icon.
UPDATE public.service_catalog sc
SET icon_key = 'drenagem-linfatica-massagem', updated_at = now()
FROM public.business_categories bc
WHERE sc.category_id = bc.id
  AND bc.slug = 'massoterapia'
  AND sc.slug = 'drenagem-linfatica'
  AND sc.icon_key IS DISTINCT FROM 'drenagem-linfatica-massagem';