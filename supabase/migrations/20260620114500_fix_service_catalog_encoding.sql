-- Repara nomes do catálogo que foram gravados com codificação incorreta.
WITH corrected(slug, name) AS (
  VALUES
    ('pigmentacao', 'Pigmentação'),
    ('coloracao', 'Coloração'),
    ('hidratacao', 'Hidratação'),
    ('esmaltacao-em-gel', 'Esmaltação em gel'),
    ('estetica-facial', 'Estética facial'),
    ('estetica-corporal', 'Estética corporal'),
    ('harmonizacao-facial', 'Harmonização facial'),
    ('massagem-terapeutica', 'Massagem terapêutica'),
    ('drenagem-linfatica', 'Drenagem linfática'),
    ('micropigmentacao', 'Micropigmentação'),
    ('extensao-de-cilios', 'Extensão de cílios'),
    ('depilacao-com-cera', 'Depilação com cera'),
    ('depilacao-a-laser', 'Depilação a laser'),
    ('depilacao-facial', 'Depilação facial'),
    ('depilacao-corporal', 'Depilação corporal'),
    ('depilacao-intima', 'Depilação íntima'),
    ('atendimento-clinico', 'Atendimento clínico'),
    ('spa-dos-pes', 'Spa dos pés')
)
UPDATE public.service_catalog AS catalog
SET name = corrected.name,
    updated_at = now()
FROM corrected
WHERE catalog.slug = corrected.slug;

NOTIFY pgrst, 'reload schema';
