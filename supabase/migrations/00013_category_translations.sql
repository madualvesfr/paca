-- Per-category translations so user-created categories display in every locale.
-- The translate-category edge function fills this in on insert/rename.
-- Defaults are backfilled from the static i18n maps used in the app today.

alter table categories
  add column if not exists name_translations jsonb;

update categories
  set name_translations = '{"en":"Food","pt":"Alimentação","ru":"Питание","uk":"Харчування"}'::jsonb
  where is_default = true and name = 'Alimentacao' and name_translations is null;

update categories
  set name_translations = '{"en":"Transport","pt":"Transporte","ru":"Транспорт","uk":"Транспорт"}'::jsonb
  where is_default = true and name = 'Transporte' and name_translations is null;

update categories
  set name_translations = '{"en":"Housing","pt":"Moradia","ru":"Жильё","uk":"Житло"}'::jsonb
  where is_default = true and name = 'Moradia' and name_translations is null;

update categories
  set name_translations = '{"en":"Leisure","pt":"Lazer","ru":"Досуг","uk":"Дозвілля"}'::jsonb
  where is_default = true and name = 'Lazer' and name_translations is null;

update categories
  set name_translations = '{"en":"Health","pt":"Saúde","ru":"Здоровье","uk":"Здоров''я"}'::jsonb
  where is_default = true and name = 'Saude' and name_translations is null;

update categories
  set name_translations = '{"en":"Education","pt":"Educação","ru":"Образование","uk":"Освіта"}'::jsonb
  where is_default = true and name = 'Educacao' and name_translations is null;

update categories
  set name_translations = '{"en":"Shopping","pt":"Compras","ru":"Покупки","uk":"Покупки"}'::jsonb
  where is_default = true and name = 'Compras' and name_translations is null;

update categories
  set name_translations = '{"en":"Entertainment","pt":"Entretenimento","ru":"Развлечения","uk":"Розваги"}'::jsonb
  where is_default = true and name = 'Entretenimento' and name_translations is null;

update categories
  set name_translations = '{"en":"Other","pt":"Outros","ru":"Прочее","uk":"Інше"}'::jsonb
  where is_default = true and name = 'Outros' and name_translations is null;
