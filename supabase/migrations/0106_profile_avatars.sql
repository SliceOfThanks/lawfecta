-- Step 18 part 3 (docs/briefs/step-18-talent-marketplace.md): ready-made profile pictures.
--   Setting profile.avatars: where the pictures are served from (base, on the Lawfecta website) and their file names.
--     The 60 names are the files Stacey uploaded to the website's Media Manager, folder "Avatars", on 2026-11-12. The
--     base stays empty until the folder's web address is confirmed; with an empty base nothing is offered.
--   A member's choice is kept on the profile (body.avatar, a file name from the list).
--   The Talent results, the profile page and the small profile card pass the choice on, so the same picture shows everywhere.
-- Additive: one setting; three functions get one more field.

insert into settings (key, value, label, section, unit, status, source, note) values
  ('profile.avatars', $json${"base": "", "files": ["8213---Boy-in-Scarf.png", "8214---Boy-in-French-Mustache.png", "8215---Man-in-Long-Beard.png", "8216---Boy-in-Bandana.png", "8217---Boy-in-Cap-and-T-Shirt.png", "8218---Boy-in-Nerdy-Glasses.png", "8219---Man-in-Weird-Expression.png", "8220---Man-in-Punk-Hairstyle.png", "8221---Boy-in-Casual-Hat.png", "8222---Boy-in-Cowboy-Hat.png", "8223---Man-in-Chin-Strap.png", "8224---Boy-in-Artist-Hat.png", "8225---Boy-with-Wavy-Hair.png", "8226---Boy-with-Long-Wavy-Hair.png", "8227---Man-in-French-Goatee.png", "8228---Boy-in-Cool-Shades.png", "8229---Man-in-Goatee.png", "8230---Nerdy-Boy-in-Hat.png", "8231---Boy-with-Cool-Hair.png", "8232---Hipster-Man-in-Shades.png", "8233---Cool-Guy-in-Sunglasses.png", "8234---Boy-in-Chin-Strap.png", "8235---Man-as-Waiter.png", "8236---Man-in-Tuxedo.png", "8237---Working-Man.png", "8238---Lady-with-Wavy-Hair.png", "8239---Lady-in-Sidebun.png", "8240---Lady-in-Hostess-Dress.png", "8241---Girl-in-Cap.png", "8242---Girl-with-Short-Hair.png", "8243---Girl-in-High-Pony.png", "8244---Girl-in-Casual-Hat.png", "8245---Girl-in-Scarf.png", "8246---Girl-in-Party-Dress.png", "8247---Girl-in-Bob-Cut-Hair.png", "8248---Girl-in-Headband.png", "8249---Girl-in-Sports-Outfit.png", "8250---Lady-Wearing-Necklace.png", "8251---Gothic-Girl.png", "8252---Girl-with-Long-Hair.png", "8253---Girl-in-Winter-Cap.png", "8254---Girl-in-Nurse-Uniform.png", "8255---Asian-Girl.png", "8256---Girl-in-Two-Ponytails.png", "8257---Cool-Girl-with-Shades.png", "8258---Elegant-Lady-in-Dress.png", "8259---Girl-in-Maid-Uniform.png", "8260---Girl-with-Curly-Hair.png", "8261---Lady-in-Nun-Dress.png", "8262---Girl-in-Elegant-Hat.png", "8263---Girl-with-Bangs.png", "8264---Girl-with-Ponytail.png", "8265---Girl-with-Side-Bangs.png", "8266---Girl-in-High-Ponytails.png", "8267---Formally-Dressed-Lady.png", "8268---Girl-as-Waitress.png", "8269---Lady-inStylish-Glasses.png", "8270---Ninja-Girl.png", "8271---Painter-Girl.png", "8272---Working-Lady.png"]}$json$::jsonb, 'Ready-made profile pictures members can choose', 'Profiles and verification', '', 'R',
    'Stacey 2026-11-12 (Talent revision, decision 6: offer all of them, keep the section compact)', 'base is the web address of the folder, ending with a slash. A member''s own uploaded photo always comes first; a ready-made picture is an illustration, never proof of identity.')
on conflict (key) do nothing;

do $mig$
declare fn text; v_def text; v_new text;
begin
  foreach fn in array array['dela_talent_search', 'dela_freelancer_profile', 'dela_freelancer_card'] loop
    v_def := pg_get_functiondef(fn::regproc);
    if position($r$'avatar', mp.body->>'avatar'$r$ in v_def) > 0 then continue; end if;
    v_new := replace(v_def, $r$'photo_file', mp.body->>'photo_file',$r$, $r$'photo_file', mp.body->>'photo_file', 'avatar', mp.body->>'avatar',$r$);
    if v_new = v_def then raise exception '%: photo_file not found', fn; end if;
    execute v_new;
  end loop;
end $mig$;
