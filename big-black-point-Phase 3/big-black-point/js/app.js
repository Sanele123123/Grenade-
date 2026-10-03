// Big Black Point — Client Intake Wizard
// 8-step guided intake that builds a structured JSON brief for the
// Claude -> static HTML/CSS/JS -> Netlify build pipeline.
// No business-type "playbook" (defaults/locks) yet — general UI only.

// ── Reference data ──────────────────────────────────────────────────────────

const SA_PROVINCES = [
  'Eastern Cape','Free State','Gauteng','KwaZulu-Natal','Limpopo',
  'Mpumalanga','North West','Northern Cape','Western Cape'
];

const CATEGORIES = {
  retail: { label: 'Retail', subcategories: {
    food_and_beverage: { label: 'Food & Beverage', types: [{v:'bakery',l:'Bakery'},{v:'butchery',l:'Butchery'},{v:'cafe',l:'Café'},{v:'convenience_store_tuck_shop',l:'Convenience store / tuck shop'},{v:'food_delivery',l:'Food delivery'},{v:'food_truck',l:'Food truck'},{v:'general_dealer_spaza_shop',l:'General dealer / spaza shop'},{v:'grocery_store_supermarket',l:'Grocery store / supermarket'},{v:'health_food_store',l:'Health food store'},{v:'liquor_store',l:'Liquor store'},{v:'micro_vendor_street_trader',l:'Micro-vendor / street trader'},{v:'organic_and_natural_products_store',l:'Organic & natural products store'},{v:'restaurant',l:'Restaurant'},{v:'bulk_food_and_dry_goods_store',l:'Bulk food & dry goods store'}] },
    clothing_and_fashion: { label: 'Clothing & Fashion', types: [{v:'clothing_store',l:'Clothing store'},{v:'fabric_and_haberdashery_store',l:'Fabric & haberdashery store'},{v:'shoe_store',l:'Shoe store'},{v:'secondhand_thrift_store',l:'Secondhand / thrift store'},{v:'uniform_and_workwear_store',l:'Uniform & workwear store'},{v:'wedding_and_bridal_store',l:'Wedding & bridal store'},{v:'swimwear_and_beachwear_store',l:'Swimwear & beachwear store'}] },
    electronics_and_technology: { label: 'Electronics & Technology', types: [{v:'cellphone_and_accessories_shop',l:'Cellphone & accessories shop'},{v:'electronics_store',l:'Electronics store'},{v:'music_and_instrument_store',l:'Music & instrument store'},{v:'office_supplies_store',l:'Office supplies store'}] },
    home_and_living: { label: 'Home & Living', types: [{v:'furniture_store',l:'Furniture store'},{v:'home_decor_store',l:'Home décor store'},{v:'kitchen_and_homeware_store',l:'Kitchen & homeware store'},{v:'garden_centre_and_nursery',l:'Garden centre & nursery'},{v:'candle_and_fragrance_store',l:'Candle & fragrance store'},{v:'art_supply_store',l:'Art supply store'},{v:'hobby_and_craft_store',l:'Hobby & craft store'}] },
    health_and_wellness_retail: { label: 'Health & Wellness Retail', types: [{v:'pharmacy_chemist',l:'Pharmacy / chemist'},{v:'cosmetics_and_beauty_supply_store',l:'Cosmetics & beauty supply store'},{v:'traditional_and_cultural_goods_store',l:'Traditional & cultural goods store'},{v:'religious_goods_store',l:'Religious goods store'}] },
    specialty_retail: { label: 'Specialty Retail', types: [{v:'bookshop',l:'Bookshop'},{v:'african_curio_and_craft_shop',l:'African curio & craft shop'},{v:'aquarium_and_fish_shop',l:'Aquarium & fish shop'},{v:'baby_and_maternity_store',l:'Baby & maternity store'},{v:'cycling_shop',l:'Cycling shop'},{v:'eyewear_optician',l:'Eyewear / optician'},{v:'florist',l:'Florist'},{v:'gift_and_novelty_shop',l:'Gift & novelty shop'},{v:'hunting_and_fishing_supply_store',l:'Hunting & fishing supply store'},{v:'jewellery_store',l:'Jewellery store'},{v:'kids_and_baby_store',l:'Kids & baby store'},{v:'luggage_and_travel_accessories_store',l:'Luggage & travel accessories store'},{v:'online_shop_e_commerce',l:'Online shop / e-commerce'},{v:'outdoor_and_camping_store',l:'Outdoor & camping store'},{v:'party_supplies_store',l:'Party supplies store'},{v:'pet_shop',l:'Pet shop'},{v:'photo_printing_and_framing_shop',l:'Photo printing & framing shop'},{v:'print_and_stationery_shop',l:'Print & stationery shop'},{v:'sporting_goods_store',l:'Sporting goods store'},{v:'toy_store',l:'Toy store'},{v:'vape_and_smoke_shop',l:'Vape & smoke shop'},{v:'watch_and_clock_shop',l:'Watch & clock shop'},{v:'wholesale_cash_and_carry',l:'Wholesale cash & carry'}] },
  }},
  construction_and_home_services: { label: 'Construction & Home Services', subcategories: {
    core_construction: { label: 'Core Construction', types: [{v:'bricklaying_and_masonry',l:'Bricklaying & masonry'},{v:'construction',l:'Construction'},{v:'demolition_and_site_clearing',l:'Demolition & site clearing'},{v:'plastering_and_screeding',l:'Plastering & screeding'},{v:'scaffolding_services',l:'Scaffolding services'},{v:'tiling_and_flooring',l:'Tiling & flooring'}] },
    finishing_and_interior: { label: 'Finishing & Interior', types: [{v:'ceiling_and_partitioning',l:'Ceiling & partitioning'},{v:'curtain_and_blind_fitting',l:'Curtain & blind fitting'},{v:'damp_proofing',l:'Damp proofing'},{v:'glass_and_glazing',l:'Glass & glazing'},{v:'interior_renovation',l:'Interior renovation'},{v:'kitchen_installation',l:'Kitchen installation'},{v:'bathroom_renovation',l:'Bathroom renovation'},{v:'painting',l:'Painting'}] },
    mechanical_and_electrical: { label: 'Mechanical & Electrical', types: [{v:'air_conditioning_and_hvac',l:'Air conditioning & HVAC'},{v:'electrician',l:'Electrician'},{v:'geyser_installation_and_repair',l:'Geyser installation & repair'},{v:'insulation_installation',l:'Insulation installation'},{v:'plumber',l:'Plumber'},{v:'solar_panel_installation',l:'Solar panel installation'}] },
    security_and_access: { label: 'Security & Access', types: [{v:'alarm_and_security_system_installation',l:'Alarm & security system installation'},{v:'cctv_installation',l:'CCTV installation'},{v:'gate_and_fence_installation',l:'Gate & fence installation'},{v:'intercom_and_access_control_installation',l:'Intercom & access control installation'},{v:'locksmith',l:'Locksmith'}] },
    outdoor_and_grounds: { label: 'Outdoor & Grounds', types: [{v:'irrigation_system_installation',l:'Irrigation system installation'},{v:'landscaping_and_gardening',l:'Landscaping & gardening'},{v:'landscape_architecture',l:'Landscape architecture'},{v:'paving_and_driveway_installation',l:'Paving & driveway installation'},{v:'roofing_and_waterproofing',l:'Roofing & waterproofing'}] },
    cleaning_and_maintenance: { label: 'Cleaning & Maintenance', types: [{v:'carpet_cleaning',l:'Carpet cleaning'},{v:'handyman',l:'Handyman'},{v:'home_inspection',l:'Home inspection'},{v:'pest_control',l:'Pest control'},{v:'pool_cleaning',l:'Pool cleaning'},{v:'pressure_washing',l:'Pressure washing'},{v:'skip_hire_and_rubble_removal',l:'Skip hire & rubble removal'},{v:'window_cleaning',l:'Window cleaning'}] },
    utilities_and_infrastructure: { label: 'Utilities & Infrastructure', types: [{v:'borehole_drilling_and_maintenance',l:'Borehole drilling & maintenance'},{v:'moving_and_furniture_assembly',l:'Moving & furniture assembly'},{v:'septic_tank_and_drainage_services',l:'Septic tank & drainage services'}] },
  }},
  repair_and_skilled_trades: { label: 'Repair & Skilled Trades', subcategories: {
    electronics_and_appliances: { label: 'Electronics & Appliances', types: [{v:'appliance_repair',l:'Appliance repair'},{v:'computer_repair',l:'Computer repair'},{v:'mobile_phone_repair',l:'Mobile phone repair'},{v:'tv_and_electronics_repair',l:'TV & electronics repair'},{v:'typewriter_and_office_equipment_repair',l:'Typewriter & office equipment repair'}] },
    vehicles_and_machinery: { label: 'Vehicles & Machinery', types: [{v:'auto_electrician',l:'Auto electrician'},{v:'bicycle_repair',l:'Bicycle repair'},{v:'boat_and_marine_repair',l:'Boat & marine repair'},{v:'small_engine_repair_lawnmowers_generators',l:'Small engine repair (lawnmowers, generators)'}] },
    furniture_and_interiors: { label: 'Furniture & Interiors', types: [{v:'art_restoration',l:'Art restoration'},{v:'blind_and_shutter_repair',l:'Blind & shutter repair'},{v:'carpentry_woodworking',l:'Carpentry / woodworking'},{v:'furniture_restoration',l:'Furniture restoration'},{v:'mattress_repair',l:'Mattress repair'},{v:'upholstery_repair',l:'Upholstery repair'}] },
    instruments_and_precision: { label: 'Instruments & Precision', types: [{v:'jewellery_repair',l:'Jewellery repair'},{v:'knife_and_tool_sharpening',l:'Knife & tool sharpening'},{v:'musical_instrument_repair',l:'Musical instrument repair'},{v:'piano_repair',l:'Piano repair'},{v:'watch_and_clock_repair',l:'Watch & clock repair'}] },
    clothing_and_textiles: { label: 'Clothing & Textiles', types: [{v:'sewing_and_alterations',l:'Sewing & alterations'},{v:'shoe_repair_cobbler',l:'Shoe repair / cobbler'}] },
    specialist_repair: { label: 'Specialist Repair', types: [{v:'fiberglass_and_composite_repair',l:'Fiberglass & composite repair'},{v:'sign_and_display_repair',l:'Sign & display repair'},{v:'trophy_and_engraving_services',l:'Trophy & engraving services'},{v:'welding_and_metal_fabrication',l:'Welding & metal fabrication'}] },
  }},
  transport_and_logistics: { label: 'Transport & Logistics', subcategories: {
    freight_and_delivery: { label: 'Freight & Delivery', types: [{v:'cold_chain_and_refrigerated_transport',l:'Cold chain & refrigerated transport'},{v:'courier_and_delivery',l:'Courier & delivery'},{v:'freight_and_trucking',l:'Freight & trucking'},{v:'hazardous_goods_transport',l:'Hazardous goods transport'},{v:'last_mile_logistics',l:'Last-mile logistics'},{v:'motorcycle_courier',l:'Motorcycle courier'},{v:'same_day_delivery_service',l:'Same-day delivery service'}] },
    passenger_transport: { label: 'Passenger Transport', types: [{v:'airport_transfers',l:'Airport transfers'},{v:'car_rental',l:'Car rental'},{v:'chauffeur_and_executive_transport',l:'Chauffeur & executive transport'},{v:'medical_patient_transport',l:'Medical patient transport'},{v:'school_transport',l:'School transport'},{v:'taxi_minibus_shuttle',l:'Taxi / minibus / shuttle'}] },
    specialist_transport: { label: 'Specialist Transport', types: [{v:'boat_and_yacht_transport',l:'Boat & yacht transport'},{v:'heavy_equipment_transport',l:'Heavy equipment transport'},{v:'moving_and_relocation',l:'Moving & relocation'},{v:'tow_truck_and_roadside_assistance',l:'Tow truck & roadside assistance'}] },
    logistics_and_supply_chain: { label: 'Logistics & Supply Chain', types: [{v:'customs_clearing_and_forwarding',l:'Customs clearing & forwarding'},{v:'packing_and_crating_services',l:'Packing & crating services'},{v:'warehousing_and_storage',l:'Warehousing & storage'}] },
  }},
  professional_services: { label: 'Professional Services', subcategories: {
    business_support: { label: 'Business Support', types: [{v:'business_coach',l:'Business coach'},{v:'business_valuation',l:'Business valuation'},{v:'consulting',l:'Consulting'},{v:'franchise_consulting',l:'Franchise consulting'},{v:'management_consultant',l:'Management consultant'},{v:'mergers_and_acquisitions_advisor',l:'Mergers & acquisitions advisor'},{v:'operations_consultant',l:'Operations consultant'},{v:'strategy_consultant',l:'Strategy consultant'}] },
    admin_and_secretarial: { label: 'Admin & Secretarial', types: [{v:'data_entry_services',l:'Data entry services'},{v:'executive_assistant_services',l:'Executive assistant services'},{v:'personal_organizer',l:'Personal organizer'},{v:'secretarial_services',l:'Secretarial services'},{v:'virtual_assistant',l:'Virtual assistant'}] },
    hr_and_people: { label: 'HR & People', types: [{v:'hr_consulting',l:'HR consulting'},{v:'payroll_services',l:'Payroll services'},{v:'recruitment',l:'Recruitment'}] },
    finance_and_risk: { label: 'Finance & Risk', types: [{v:'compliance_consulting',l:'Compliance consulting'},{v:'export_and_import_consulting',l:'Export & import consulting'},{v:'financial_planning',l:'Financial planning'},{v:'insurance_agent',l:'Insurance agent'},{v:'mortgage_advisor',l:'Mortgage advisor'},{v:'private_detective',l:'Private detective'},{v:'risk_management',l:'Risk management'},{v:'supply_chain_consulting',l:'Supply chain consulting'}] },
    research_and_writing: { label: 'Research & Writing', types: [{v:'grant_writing',l:'Grant writing'},{v:'market_research',l:'Market research'},{v:'mystery_shopping',l:'Mystery shopping'},{v:'research_and_analysis',l:'Research & analysis'},{v:'tender_and_proposal_writing',l:'Tender & proposal writing'}] },
  }},
  accounting_and_legal: { label: 'Accounting & Legal', subcategories: {
    accounting_and_finance: { label: 'Accounting & Finance', types: [{v:'accounting_and_bookkeeping',l:'Accounting & bookkeeping'},{v:'auditing',l:'Auditing'},{v:'forensic_accounting',l:'Forensic accounting'},{v:'payroll_administration',l:'Payroll administration'},{v:'tax_return_filing',l:'Tax return filing'}] },
    legal_services: { label: 'Legal Services', types: [{v:'contract_drafting',l:'Contract drafting'},{v:'conveyancing',l:'Conveyancing'},{v:'debt_collection',l:'Debt collection'},{v:'immigration_and_visa_services',l:'Immigration & visa services'},{v:'insolvency_and_liquidation_services',l:'Insolvency & liquidation services'},{v:'intellectual_property_and_trademarks',l:'Intellectual property & trademarks'},{v:'labour_law_consulting',l:'Labour law consulting'},{v:'legal_consulting',l:'Legal consulting'},{v:'legal_services',l:'Legal services'},{v:'mediation_and_arbitration',l:'Mediation & arbitration'},{v:'notary',l:'Notary'},{v:'patent_attorney',l:'Patent attorney'}] },
    compliance_and_administration: { label: 'Compliance & Administration', types: [{v:'cipc_and_compliance_services',l:'CIPC & compliance services'},{v:'company_registration_and_secretarial',l:'Company registration & secretarial'},{v:'estate_planning_and_wills',l:'Estate planning & wills'}] },
  }},
  it_and_software: { label: 'IT & Software', subcategories: {
    development: { label: 'Development', types: [{v:'custom_database_development',l:'Custom database development'},{v:'e_commerce_development',l:'E-commerce development'},{v:'mobile_app_development',l:'Mobile app development'},{v:'software_development',l:'Software development'},{v:'web_design',l:'Web design'},{v:'web_development',l:'Web development'},{v:'uiux_design',l:'UI/UX design'}] },
    infrastructure_and_support: { label: 'Infrastructure & Support', types: [{v:'cloud_services_and_migration',l:'Cloud services & migration'},{v:'cybersecurity_services',l:'Cybersecurity services'},{v:'data_backup_and_recovery',l:'Data backup & recovery'},{v:'domain_and_hosting_reseller',l:'Domain & hosting reseller'},{v:'it_consulting',l:'IT consulting'},{v:'it_support_and_helpdesk',l:'IT support & helpdesk'},{v:'network_setup_and_administration',l:'Network setup & administration'},{v:'server_management_and_hosting',l:'Server management & hosting'}] },
    business_systems: { label: 'Business Systems', types: [{v:'erp_and_crm_implementation',l:'ERP & CRM implementation'},{v:'pos_system_setup_and_support',l:'POS system setup & support'},{v:'cctv_and_access_control_it_integration',l:'CCTV & access control IT integration'},{v:'tech_procurement_and_hardware_supply',l:'Tech procurement & hardware supply'}] },
    training: { label: 'Training', types: [{v:'it_training_and_certification',l:'IT training & certification'}] },
  }},
  marketing_and_communications: { label: 'Marketing & Communications', subcategories: {
    strategy_and_branding: { label: 'Strategy & Branding', types: [{v:'advertising_agency',l:'Advertising agency'},{v:'brand_strategy_and_identity',l:'Brand strategy & identity'},{v:'digital_marketing',l:'Digital marketing'},{v:'logo_design',l:'Logo design'},{v:'marketing',l:'Marketing'},{v:'market_research',l:'Market research'},{v:'reputation_management',l:'Reputation management'}] },
    content_and_copy: { label: 'Content & Copy', types: [{v:'article_writing',l:'Article writing'},{v:'copywriting',l:'Copywriting'},{v:'content_marketing',l:'Content marketing'},{v:'newsletter_management',l:'Newsletter management'},{v:'proofreading_and_editing',l:'Proofreading & editing'},{v:'scriptwriting',l:'Scriptwriting'},{v:'voiceover_and_narration',l:'Voiceover & narration'}] },
    social_and_community: { label: 'Social & Community', types: [{v:'community_management',l:'Community management'},{v:'influencer_marketing',l:'Influencer marketing'},{v:'social_media_manager',l:'Social media manager'}] },
    design_and_print: { label: 'Design & Print', types: [{v:'graphic_design',l:'Graphic design'},{v:'promotional_merchandise',l:'Promotional merchandise'},{v:'signage_and_outdoor_advertising',l:'Signage & outdoor advertising'}] },
    pr_and_advertising: { label: 'PR & Advertising', types: [{v:'email_marketing',l:'Email marketing'},{v:'event_marketing',l:'Event marketing'},{v:'exhibition_and_trade_show_services',l:'Exhibition & trade show services'},{v:'flyer_and_leaflet_distribution',l:'Flyer & leaflet distribution'},{v:'public_relations',l:'Public relations'},{v:'radio_and_tv_advertising_production',l:'Radio & TV advertising production'},{v:'seo_and_sem_services',l:'SEO & SEM services'}] },
    specialist: { label: 'Specialist', types: [{v:'photography_for_marketing',l:'Photography for marketing'},{v:'translation',l:'Translation'},{v:'videography_for_marketing',l:'Videography for marketing'}] },
  }},
  health: { label: 'Health', subcategories: {
    primary_and_general_care: { label: 'Primary & General Care', types: [{v:'emergency_medical_services_ems',l:'Emergency medical services (EMS)'},{v:'general_practitioner_gp',l:'General practitioner (GP)'},{v:'medical_practice_clinic',l:'Medical practice / clinic'},{v:'nursing_and_home_care',l:'Nursing & home care'},{v:'occupational_health_clinic',l:'Occupational health clinic'},{v:'school_health_services',l:'School health services'},{v:'specialist_medical_practice',l:'Specialist medical practice'},{v:'telehealth_and_online_consultation',l:'Telehealth & online consultation'}] },
    dental: { label: 'Dental', types: [{v:'dental',l:'Dental'}] },
    allied_health: { label: 'Allied Health', types: [{v:'audiology',l:'Audiology'},{v:'dietitian_and_nutritionist',l:'Dietitian & nutritionist'},{v:'midwife',l:'Midwife'},{v:'occupational_therapy',l:'Occupational therapy'},{v:'optometry',l:'Optometry'},{v:'physiotherapy_physical_therapy',l:'Physiotherapy / physical therapy'},{v:'radiography_and_imaging',l:'Radiography & imaging'},{v:'speech_therapy',l:'Speech therapy'}] },
    mental_health: { label: 'Mental Health', types: [{v:'addiction_and_rehabilitation_services',l:'Addiction & rehabilitation services'},{v:'guidance_counseling',l:'Guidance / counseling'},{v:'psychiatric_services',l:'Psychiatric services'},{v:'psychology',l:'Psychology'}] },
    alternative_and_complementary: { label: 'Alternative & Complementary', types: [{v:'acupuncture',l:'Acupuncture'},{v:'chiropractic',l:'Chiropractic'},{v:'homeopathy',l:'Homeopathy'},{v:'massage_therapy',l:'Massage therapy'},{v:'naturopathy',l:'Naturopathy'}] },
    specialist_and_community_health: { label: 'Specialist & Community Health', types: [{v:'blood_testing_and_pathology',l:'Blood testing & pathology'},{v:'elder_care',l:'Elder care'},{v:'hivaids_care_and_support',l:'HIV/AIDS care & support'},{v:'medical_equipment_supply_and_repair',l:'Medical equipment supply & repair'},{v:'palliative_and_hospice_care',l:'Palliative & hospice care'},{v:'pharmacy_compounding',l:'Pharmacy compounding'},{v:'tb_and_chronic_disease_management',l:'TB & chronic disease management'},{v:'wound_care_and_dressing_services',l:'Wound care & dressing services'}] },
  }},
  wellness_and_fitness: { label: 'Wellness & Fitness', subcategories: {
    physical_training: { label: 'Physical Training', types: [{v:'boxing_and_kickboxing',l:'Boxing & kickboxing'},{v:'crossfit_and_functional_training',l:'CrossFit & functional training'},{v:'cycling_studio_spin_class',l:'Cycling studio / spin class'},{v:'gym_and_fitness',l:'Gym & fitness'},{v:'martial_arts_and_self_defence',l:'Martial arts & self-defence'},{v:'outdoor_and_adventure_fitness',l:'Outdoor & adventure fitness'},{v:'personal_training',l:'Personal training'},{v:'pilates_studio',l:'Pilates studio'},{v:'rehabilitation_and_injury_recovery_coaching',l:'Rehabilitation & injury recovery coaching'},{v:'sports_instruction',l:'Sports instruction'},{v:'stretching_and_mobility_coaching',l:'Stretching & mobility coaching'},{v:'swimming_instruction',l:'Swimming instruction'}] },
    mind_and_body: { label: 'Mind & Body', types: [{v:'breathwork_and_somatic_therapy',l:'Breathwork & somatic therapy'},{v:'dance_studio',l:'Dance studio'},{v:'meditation_and_mindfulness_coaching',l:'Meditation & mindfulness coaching'},{v:'yoga_instruction',l:'Yoga instruction'}] },
    holistic_and_energy: { label: 'Holistic & Energy', types: [{v:'aromatherapy',l:'Aromatherapy'},{v:'energy_healing_reiki',l:'Energy healing / Reiki'},{v:'hypnotherapy',l:'Hypnotherapy'},{v:'psychic',l:'Psychic'},{v:'reflexology',l:'Reflexology'},{v:'traditional_health_practitioner',l:'Traditional health practitioner'}] },
    coaching_and_lifestyle: { label: 'Coaching & Lifestyle', types: [{v:'kids_sports_and_movement_classes',l:'Kids sports & movement classes'},{v:'life_coaching',l:'Life coaching'},{v:'nutritional_coaching',l:'Nutritional coaching'},{v:'corporate_wellness_programs',l:'Corporate wellness programs'},{v:'weight_loss_coaching',l:'Weight loss coaching'},{v:'wellness_coach',l:'Wellness coach'}] },
  }},
  beauty_and_personal_care: { label: 'Beauty & Personal Care', subcategories: {
    hair: { label: 'Hair', types: [{v:'barbershop_barber',l:'Barbershop / barber'},{v:'hairdresser',l:'Hairdresser'},{v:'hair_extensions_and_weave_specialist',l:'Hair extensions & weave specialist'},{v:'natural_and_loc_hair_specialist',l:'Natural & loc hair specialist'}] },
    skin_and_body: { label: 'Skin & Body', types: [{v:'beauty_salon',l:'Beauty salon'},{v:'lash_and_brow_studio',l:'Lash & brow studio'},{v:'makeup_artistry',l:'Makeup artistry'},{v:'microblading_and_permanent_makeup',l:'Microblading & permanent makeup'},{v:'skincare_and_facial_studio',l:'Skincare & facial studio'},{v:'spray_tan_and_body_contouring',l:'Spray tan & body contouring'},{v:'waxing_and_threading_studio',l:'Waxing & threading studio'}] },
    nails: { label: 'Nails', types: [{v:'nail_bar',l:'Nail bar'}] },
    specialist: { label: 'Specialist', types: [{v:'bridal_hair_and_makeup',l:'Bridal hair & makeup'},{v:'mens_grooming_studio',l:'Men\'s grooming studio'},{v:'mobile_beauty_services',l:'Mobile beauty services'},{v:'spa_and_wellness_centre',l:'Spa & wellness centre'},{v:'sauna_and_steam_bath',l:'Sauna & steam bath'},{v:'tattoo_studio',l:'Tattoo studio'},{v:'piercing_studio',l:'Piercing studio'},{v:'teeth_whitening_studio',l:'Teeth whitening studio'}] },
  }},
  education_and_training: { label: 'Education & Training', subcategories: {
    academic_support: { label: 'Academic Support', types: [{v:'after_school_care_and_homework_centre',l:'After-school care & homework centre'},{v:'extra_classes_study_centre',l:'Extra classes / study centre'},{v:'private_lessons_tutoring',l:'Private lessons / tutoring'},{v:'special_needs_education',l:'Special needs education'},{v:'test_and_exam_preparation',l:'Test & exam preparation'}] },
    skills_and_vocational: { label: 'Skills & Vocational', types: [{v:'adult_education_and_literacy',l:'Adult education & literacy'},{v:'coding_and_tech_bootcamp',l:'Coding & tech bootcamp'},{v:'driving_school',l:'Driving school'},{v:'safety_and_first_aid_training',l:'Safety & first aid training'},{v:'seta_accredited_training_provider',l:'SETA-accredited training provider'},{v:'skills_development_facilitator_sdf',l:'Skills development facilitator (SDF)'},{v:'vocational_and_skills_training',l:'Vocational & skills training'}] },
    creative_and_physical: { label: 'Creative & Physical', types: [{v:'art_and_creative_classes',l:'Art & creative classes'},{v:'cooking_and_baking_school',l:'Cooking & baking school'},{v:'dance_classes',l:'Dance classes'},{v:'drama_and_theatre_school',l:'Drama & theatre school'},{v:'music_teacher',l:'Music teacher'},{v:'sports_coaching_academy',l:'Sports coaching academy'}] },
    language: { label: 'Language', types: [{v:'foreign_language_tutoring',l:'Foreign language tutoring'},{v:'language_school',l:'Language school'}] },
    business_and_professional: { label: 'Business & Professional', types: [{v:'corporate_training_and_development',l:'Corporate training & development'},{v:'entrepreneurship_training',l:'Entrepreneurship training'},{v:'financial_literacy_training',l:'Financial literacy training'},{v:'leadership_and_management_training',l:'Leadership & management training'},{v:'online_course_creator',l:'Online course creator'}] },
    early_childhood: { label: 'Early Childhood', types: [{v:'early_childhood_development_ecd',l:'Early childhood development (ECD)'}] },
    stem_and_tech: { label: 'STEM & Tech', types: [{v:'stem_education_programs',l:'STEM education programs'}] },
  }},
  creative_and_media: { label: 'Creative & Media', subcategories: {
    photography_and_video: { label: 'Photography & Video', types: [{v:'film_and_documentary_production',l:'Film & documentary production'},{v:'photography',l:'Photography'},{v:'videography_video_production',l:'Videography / video production'}] },
    audio: { label: 'Audio', types: [{v:'audio_production',l:'Audio production'},{v:'music_production',l:'Music production'},{v:'podcast_production',l:'Podcast production'},{v:'recording_studio',l:'Recording studio'},{v:'voice_acting_and_dubbing',l:'Voice acting & dubbing'}] },
    design_and_art: { label: 'Design & Art', types: [{v:'animation_and_motion_graphics',l:'Animation & motion graphics'},{v:'fine_art_and_painting',l:'Fine art & painting'},{v:'graphic_design_creative',l:'Graphic design (creative)'},{v:'illustration_and_digital_art',l:'Illustration & digital art'},{v:'interior_design',l:'Interior design'},{v:'murals_and_street_art',l:'Murals & street art'},{v:'sculpture_and_ceramics',l:'Sculpture & ceramics'}] },
    writing_and_publishing: { label: 'Writing & Publishing', types: [{v:'book_publishing_and_self_publishing',l:'Book publishing & self-publishing'},{v:'comic_and_graphic_novel_creation',l:'Comic & graphic novel creation'},{v:'magazine_and_newsletter_publishing',l:'Magazine & newsletter publishing'},{v:'scriptwriting_and_screenwriting',l:'Scriptwriting & screenwriting'}] },
    craft_and_making: { label: 'Craft & Making', types: [{v:'craft_and_handmade_goods',l:'Craft & handmade goods'},{v:'fashion_design',l:'Fashion design'},{v:'jewellery_design_and_making',l:'Jewellery design & making'},{v:'prop_making',l:'Prop making'},{v:'textile_and_fabric_design',l:'Textile & fabric design'}] },
    spatial_and_experience: { label: 'Spatial & Experience', types: [{v:'exhibition_design',l:'Exhibition design'},{v:'game_design_and_development',l:'Game design & development'},{v:'printing_and_signage',l:'Printing & signage'},{v:'stage_and_set_design',l:'Stage & set design'}] },
  }},
  hospitality_and_events: { label: 'Hospitality & Events', subcategories: {
    accommodation: { label: 'Accommodation', types: [{v:'backpacker_hostel',l:'Backpacker hostel'},{v:'hotel_guesthouse_bandb',l:'Hotel / guesthouse / B&B'}] },
    food_and_drink: { label: 'Food & Drink', types: [{v:'catering_and_events',l:'Catering & events'},{v:'cooking_and_private_chef_services',l:'Cooking & private chef services'},{v:'food_and_beverage_pop_up',l:'Food & beverage pop-up'},{v:'ghost_kitchen_cloud_kitchen',l:'Ghost kitchen / cloud kitchen'},{v:'shebeen_tavern',l:'Shebeen / tavern'},{v:'wine_and_spirits_tasting_events',l:'Wine & spirits tasting events'}] },
    events_and_entertainment: { label: 'Events & Entertainment', types: [{v:'bouncy_castle_and_kids_entertainment',l:'Bouncy castle & kids entertainment'},{v:'conference_and_meeting_venue',l:'Conference & meeting venue'},{v:'dj',l:'DJ'},{v:'escape_room_and_entertainment_venue',l:'Escape room & entertainment venue'},{v:'event_planning',l:'Event planning'},{v:'game_and_activity_hire',l:'Game & activity hire'},{v:'live_band_and_entertainment_booking',l:'Live band & entertainment booking'},{v:'master_of_ceremonies_mc',l:'Master of ceremonies (MC)'},{v:'party_hire_and_equipment_rental',l:'Party hire & equipment rental'},{v:'photobooth_hire',l:'Photobooth hire'},{v:'sound_and_lighting_hire',l:'Sound & lighting hire'},{v:'tent_and_marquee_hire',l:'Tent & marquee hire'},{v:'wedding_planner',l:'Wedding planner'}] },
    tourism: { label: 'Tourism', types: [{v:'adventure_and_eco_tourism',l:'Adventure & eco tourism'},{v:'corporate_team_building',l:'Corporate team building'},{v:'cultural_and_heritage_tours',l:'Cultural & heritage tours'},{v:'safari_and_wildlife_tours',l:'Safari & wildlife tours'},{v:'tourism_tour_guide',l:'Tourism / tour guide'},{v:'township_tours',l:'Township tours'}] },
    support_services: { label: 'Support Services', types: [{v:'decor_and_styling_services',l:'Decor & styling services'},{v:'hostess_and_promotional_staff_agency',l:'Hostess & promotional staff agency'},{v:'security_for_events',l:'Security for events'}] },
  }},
  real_estate: { label: 'Real Estate', subcategories: {
    agency_and_sales: { label: 'Agency & Sales', types: [{v:'commercial_property_leasing',l:'Commercial property leasing'},{v:'estate_agent_training_and_mentorship',l:'Estate agent training & mentorship'},{v:'industrial_property_leasing',l:'Industrial property leasing'},{v:'land_sales_and_subdivision',l:'Land sales & subdivision'},{v:'real_estate_agency',l:'Real estate agency'},{v:'relocation_services',l:'Relocation services'}] },
    management: { label: 'Management', types: [{v:'body_corporate_management',l:'Body corporate management'},{v:'building_and_facilities_management',l:'Building & facilities management'},{v:'holiday_and_short_term_rental_management',l:'Holiday & short-term rental management'},{v:'property_management',l:'Property management'},{v:'student_accommodation_management',l:'Student accommodation management'}] },
    development_and_investment: { label: 'Development & Investment', types: [{v:'property_development',l:'Property development'},{v:'property_investment_consulting',l:'Property investment consulting'},{v:'property_valuation',l:'Property valuation'}] },
    support_services: { label: 'Support Services', types: [{v:'property_photography_and_virtual_tours',l:'Property photography & virtual tours'}] },
  }},
  agriculture: { label: 'Agriculture', subcategories: {
    farming: { label: 'Farming', types: [{v:'aquaculture_and_fish_farming',l:'Aquaculture & fish farming'},{v:'beekeeping_and_honey_production',l:'Beekeeping & honey production'},{v:'community_food_garden',l:'Community food garden'},{v:'crop_farming',l:'Crop farming'},{v:'dairy_farming',l:'Dairy farming'},{v:'fruit_and_vegetable_farming',l:'Fruit & vegetable farming'},{v:'herb_and_medicinal_plant_farming',l:'Herb & medicinal plant farming'},{v:'hydroponics_and_urban_farming',l:'Hydroponics & urban farming'},{v:'livestock_farming',l:'Livestock farming'},{v:'mushroom_cultivation',l:'Mushroom cultivation'},{v:'organic_farming',l:'Organic farming'},{v:'poultry_farming',l:'Poultry farming'},{v:'smallholder_farming',l:'Smallholder farming'}] },
    agri_business: { label: 'Agri-Business', types: [{v:'agri_processing',l:'Agri-processing'},{v:'agri_supplies_and_equipment',l:'Agri-supplies & equipment'},{v:'agricultural_consulting',l:'Agricultural consulting'},{v:'agri_tourism_and_farm_stays',l:'Agri-tourism & farm stays'},{v:'grain_storage_and_milling',l:'Grain storage & milling'}] },
    support_services: { label: 'Support Services', types: [{v:'farm_equipment_repair_and_maintenance',l:'Farm equipment repair & maintenance'},{v:'irrigation_and_water_management',l:'Irrigation & water management'},{v:'veterinary_services_farm_animals',l:'Veterinary services (farm animals)'}] },
  }},
  manufacturing_and_wholesale: { label: 'Manufacturing & Wholesale', subcategories: {
    food_and_beverage: { label: 'Food & Beverage', types: [{v:'craft_brewing_and_distilling',l:'Craft brewing & distilling'},{v:'food_and_beverage_manufacturing',l:'Food & beverage manufacturing'}] },
    goods_and_products: { label: 'Goods & Products', types: [{v:'building_materials_manufacturing',l:'Building materials manufacturing'},{v:'candle_and_cosmetics_manufacturing',l:'Candle & cosmetics manufacturing'},{v:'chemical_and_cleaning_products_manufacturing',l:'Chemical & cleaning products manufacturing'},{v:'clothing_and_textile_manufacturing',l:'Clothing & textile manufacturing'},{v:'electronic_assembly',l:'Electronic assembly'},{v:'furniture_manufacturing',l:'Furniture manufacturing'},{v:'medical_device_and_equipment_manufacturing',l:'Medical device & equipment manufacturing'},{v:'metal_fabrication_and_engineering',l:'Metal fabrication & engineering'},{v:'packaging_manufacturing',l:'Packaging manufacturing'},{v:'paper_and_cardboard_products',l:'Paper & cardboard products'},{v:'plastic_and_rubber_products',l:'Plastic & rubber products'},{v:'promotional_products_manufacturing',l:'Promotional products manufacturing'},{v:'toy_and_games_manufacturing',l:'Toy & games manufacturing'}] },
    trade: { label: 'Trade', types: [{v:'agent_and_distributor_services',l:'Agent & distributor services'},{v:'import_and_export_trading',l:'Import & export trading'},{v:'light_manufacturing',l:'Light manufacturing'},{v:'printing_and_publication_manufacturing',l:'Printing & publication manufacturing'},{v:'wholesale_and_distribution',l:'Wholesale & distribution'}] },
  }},
  animals_and_pets: { label: 'Animals & Pets', subcategories: {
    care_and_services: { label: 'Care & Services', types: [{v:'animal_behaviour_consulting',l:'Animal behaviour consulting'},{v:'mobile_vet_services',l:'Mobile vet services'},{v:'pet_boarding_and_kennels',l:'Pet boarding & kennels'},{v:'pet_cremation_and_memorial_services',l:'Pet cremation & memorial services'},{v:'pet_grooming',l:'Pet grooming'},{v:'pet_sitting',l:'Pet sitting'},{v:'veterinary_clinic',l:'Veterinary clinic'}] },
    training_and_activity: { label: 'Training & Activity', types: [{v:'dog_training',l:'Dog training'},{v:'dog_walking',l:'Dog walking'},{v:'horse_riding_and_equestrian_services',l:'Horse riding & equestrian services'}] },
    specialist: { label: 'Specialist', types: [{v:'animal_rescue_and_shelter',l:'Animal rescue & shelter'},{v:'aquarium_and_exotic_pet_care',l:'Aquarium & exotic pet care'},{v:'bird_keeping_and_aviary_services',l:'Bird keeping & aviary services'},{v:'cat_cafe_animal_cafe',l:'Cat café / animal café'},{v:'farm_animal_care',l:'Farm animal care'},{v:'reptile_care_and_specialist_services',l:'Reptile care & specialist services'}] },
    retail_and_products: { label: 'Retail & Products', types: [{v:'pet_food_and_supplies_store',l:'Pet food & supplies store'},{v:'pet_photography',l:'Pet photography'}] },
  }},
  sustainable_and_energy: { label: 'Sustainable & Energy', subcategories: {
    energy: { label: 'Energy', types: [{v:'biogas_and_biomass_energy',l:'Biogas & biomass energy'},{v:'clean_technology_consulting',l:'Clean technology consulting'},{v:'ev_charging_installation',l:'EV charging installation'},{v:'solar_panel_installation_and_maintenance',l:'Solar panel installation & maintenance'},{v:'sustainable_energy_consultant',l:'Sustainable energy consultant'},{v:'wind_energy_consulting',l:'Wind energy consulting'}] },
    waste_and_recycling: { label: 'Waste & Recycling', types: [{v:'composting_services',l:'Composting services'},{v:'e_waste_collection_and_recycling',l:'E-waste collection & recycling'},{v:'recycling_services',l:'Recycling services'},{v:'upcycling_and_repurposing_services',l:'Upcycling & repurposing services'},{v:'waste_removal',l:'Waste removal'}] },
    environment_and_compliance: { label: 'Environment & Compliance', types: [{v:'carbon_footprint_consulting',l:'Carbon footprint consulting'},{v:'energy_auditing',l:'Energy auditing'},{v:'environmental_compliance_consulting',l:'Environmental compliance consulting'},{v:'green_building_consulting',l:'Green building consulting'},{v:'sustainable_packaging_supply',l:'Sustainable packaging supply'},{v:'tree_planting_and_reforestation_services',l:'Tree planting & reforestation services'},{v:'water_harvesting_and_conservation',l:'Water harvesting & conservation'}] },
  }},
  community_and_non_profit: { label: 'Community & Non-Profit', subcategories: {
    social_services: { label: 'Social Services', types: [{v:'child_and_family_services',l:'Child & family services'},{v:'disability_support_services',l:'Disability support services'},{v:'food_bank_and_soup_kitchen',l:'Food bank & soup kitchen'},{v:'homeless_shelter_and_outreach',l:'Homeless shelter & outreach'},{v:'microfinance_and_savings_group',l:'Microfinance & savings group'},{v:'victim_support_and_legal_aid',l:'Victim support & legal aid'}] },
    health_and_wellbeing: { label: 'Health & Wellbeing', types: [{v:'community_health_clinic',l:'Community health clinic'},{v:'lgbtq_support_organization',l:'LGBTQ+ support organization'},{v:'womens_empowerment_group',l:'Women\'s empowerment group'}] },
    youth_and_education: { label: 'Youth & Education', types: [{v:'after_school_and_youth_program',l:'After-school & youth program'},{v:'skills_development_ngo',l:'Skills development NGO'},{v:'youth_development_organization',l:'Youth development organization'}] },
    community_and_culture: { label: 'Community & Culture', types: [{v:'community_association_stokvel',l:'Community association / stokvel'},{v:'community_media_and_radio_station',l:'Community media & radio station'},{v:'community_sports_club',l:'Community sports club'},{v:'cultural_and_heritage_organization',l:'Cultural & heritage organization'}] },
    faith_and_civic: { label: 'Faith & Civic', types: [{v:'church_religious_organization',l:'Church / religious organization'},{v:'non_profit_ngo',l:'Non-profit / NGO'}] },
    environment_and_animals: { label: 'Environment & Animals', types: [{v:'animal_welfare_organization',l:'Animal welfare organization'},{v:'environmental_and_conservation_ngo',l:'Environmental & conservation NGO'}] },
  }},
  other: { label: 'Other', subcategories: {
    other: { label: 'Other', types: [{v:'other_free_text',l:'Other (free text)'}] },
  }},
};

// Flat, searchable list of every business type across all categories/subcategories —
// lets someone search "bakery" or "salon" directly instead of drilling through
// category → subcategory → type by hand.
const BUSINESS_TYPE_INDEX = Object.entries(CATEGORIES).flatMap(([catKey, cat]) =>
  Object.entries(cat.subcategories).flatMap(([subKey, sub]) =>
    sub.types.map(t => ({ category: catKey, categoryLabel: cat.label, subcategory: subKey, subcategoryLabel: sub.label, type: t.v, typeLabel: t.l }))
  )
);

// Business-type playbook — subcategory-level smart defaults for Look & Feel and
// Call to Action. These pre-fill fields that are still empty when a subcategory is
// chosen; they never overwrite a field the user has already set themselves.
// Keyed by [category][subcategory] since subcategory slugs are not globally unique
// (e.g. 'food_and_beverage' exists under both Retail and Manufacturing & Wholesale).
const PLAYBOOK = {
  retail: {
    food_and_beverage: {personality:['friendly_approachable','craft_artisanal'], theme:'retro', visual_density:'balanced', color_palette:'warm', main_goal:['get_whatsapp_messages','drive_foot_traffic'], primary_button_text:['whatsapp_us','view_products']},
    clothing_and_fashion: {personality:['playful_whimsical','friendly_approachable'], theme:'contemporary', visual_density:'rich', color_palette:'vibrant', main_goal:['drive_foot_traffic','build_awareness'], primary_button_text:['view_products','whatsapp_us']},
    electronics_and_technology: {personality:['professional_expert','playful_whimsical'], theme:'modern', visual_density:'dense', color_palette:'neutral', main_goal:['drive_foot_traffic','get_whatsapp_messages'], primary_button_text:['view_products','get_in_touch']},
    home_and_living: {personality:['craft_artisanal','friendly_approachable'], theme:'contemporary', visual_density:'balanced', color_palette:'earthy', main_goal:['drive_foot_traffic','get_whatsapp_messages'], primary_button_text:['view_products','whatsapp_us']},
    health_and_wellness_retail: {personality:['friendly_approachable','professional_expert'], theme:'contemporary', visual_density:'balanced', color_palette:'ocean', main_goal:['get_whatsapp_messages','drive_foot_traffic'], primary_button_text:['get_in_touch','whatsapp_us']},
    specialty_retail: {personality:['playful_whimsical','craft_artisanal'], theme:'contemporary', visual_density:'rich', color_palette:'vibrant', main_goal:['drive_foot_traffic','build_awareness'], primary_button_text:['view_products','whatsapp_us']},
  },
  construction_and_home_services: {
    core_construction: {personality:['professional_expert','craft_artisanal'], theme:'contemporary', visual_density:'balanced', color_palette:'neutral', main_goal:['get_bookings','get_whatsapp_messages'], primary_button_text:['request_a_quote','whatsapp_us']},
    finishing_and_interior: {personality:['professional_expert','craft_artisanal'], theme:'contemporary', visual_density:'balanced', color_palette:'neutral', main_goal:['get_bookings','get_whatsapp_messages'], primary_button_text:['request_a_quote','whatsapp_us']},
    mechanical_and_electrical: {personality:['professional_expert','craft_artisanal'], theme:'contemporary', visual_density:'balanced', color_palette:'neutral', main_goal:['get_bookings','get_whatsapp_messages'], primary_button_text:['request_a_quote','whatsapp_us']},
    security_and_access: {personality:['professional_expert','craft_artisanal'], theme:'contemporary', visual_density:'balanced', color_palette:'neutral', main_goal:['get_bookings','get_whatsapp_messages'], primary_button_text:['request_a_quote','whatsapp_us']},
    outdoor_and_grounds: {personality:['professional_expert','craft_artisanal'], theme:'contemporary', visual_density:'balanced', color_palette:'neutral', main_goal:['get_bookings','get_whatsapp_messages'], primary_button_text:['request_a_quote','whatsapp_us']},
    cleaning_and_maintenance: {personality:['professional_expert','friendly_approachable'], theme:'modern', visual_density:'balanced', color_palette:'neutral', main_goal:['get_bookings','get_whatsapp_messages'], primary_button_text:['request_a_quote','whatsapp_us']},
    utilities_and_infrastructure: {personality:['professional_expert','craft_artisanal'], theme:'contemporary', visual_density:'balanced', color_palette:'neutral', main_goal:['get_bookings','get_whatsapp_messages'], primary_button_text:['request_a_quote','whatsapp_us']},
  },
  repair_and_skilled_trades: {
    electronics_and_appliances: {personality:['professional_expert','friendly_approachable'], theme:'modern', visual_density:'balanced', color_palette:'neutral', main_goal:['get_bookings','get_whatsapp_messages'], primary_button_text:['request_a_quote','whatsapp_us']},
    vehicles_and_machinery: {personality:['professional_expert','friendly_approachable'], theme:'modern', visual_density:'balanced', color_palette:'neutral', main_goal:['get_bookings','get_whatsapp_messages'], primary_button_text:['request_a_quote','whatsapp_us']},
    furniture_and_interiors: {personality:['professional_expert','friendly_approachable'], theme:'modern', visual_density:'balanced', color_palette:'neutral', main_goal:['get_bookings','get_whatsapp_messages'], primary_button_text:['request_a_quote','whatsapp_us']},
    instruments_and_precision: {personality:['professional_expert','friendly_approachable'], theme:'modern', visual_density:'balanced', color_palette:'neutral', main_goal:['get_bookings','get_whatsapp_messages'], primary_button_text:['request_a_quote','whatsapp_us']},
    clothing_and_textiles: {personality:['professional_expert','friendly_approachable'], theme:'modern', visual_density:'balanced', color_palette:'neutral', main_goal:['get_bookings','get_whatsapp_messages'], primary_button_text:['request_a_quote','whatsapp_us']},
    specialist_repair: {personality:['professional_expert','friendly_approachable'], theme:'modern', visual_density:'balanced', color_palette:'neutral', main_goal:['get_bookings','get_whatsapp_messages'], primary_button_text:['request_a_quote','whatsapp_us']},
  },
  transport_and_logistics: {
    freight_and_delivery: {personality:['professional_expert'], theme:'modern', visual_density:'balanced', color_palette:'neutral', main_goal:['get_bookings','build_awareness'], primary_button_text:['request_a_quote','get_in_touch']},
    passenger_transport: {personality:['professional_expert'], theme:'modern', visual_density:'balanced', color_palette:'neutral', main_goal:['get_bookings','build_awareness'], primary_button_text:['request_a_quote','get_in_touch']},
    specialist_transport: {personality:['professional_expert'], theme:'modern', visual_density:'balanced', color_palette:'neutral', main_goal:['get_bookings','build_awareness'], primary_button_text:['request_a_quote','get_in_touch']},
    logistics_and_supply_chain: {personality:['professional_expert'], theme:'modern', visual_density:'balanced', color_palette:'neutral', main_goal:['get_bookings','build_awareness'], primary_button_text:['request_a_quote','get_in_touch']},
  },
  professional_services: {
    business_support: {personality:['professional_expert','prestigious_luxurious'], theme:'modern', visual_density:'balanced', color_palette:'neutral', main_goal:['get_bookings','build_awareness'], primary_button_text:['get_in_touch','request_a_quote']},
    admin_and_secretarial: {personality:['professional_expert','prestigious_luxurious'], theme:'modern', visual_density:'balanced', color_palette:'neutral', main_goal:['get_bookings','build_awareness'], primary_button_text:['get_in_touch','request_a_quote']},
    hr_and_people: {personality:['professional_expert','prestigious_luxurious'], theme:'modern', visual_density:'balanced', color_palette:'neutral', main_goal:['get_bookings','build_awareness'], primary_button_text:['get_in_touch','request_a_quote']},
    finance_and_risk: {personality:['professional_expert','prestigious_luxurious'], theme:'modern', visual_density:'balanced', color_palette:'neutral', main_goal:['get_bookings','build_awareness'], primary_button_text:['get_in_touch','request_a_quote']},
    research_and_writing: {personality:['professional_expert','prestigious_luxurious'], theme:'modern', visual_density:'balanced', color_palette:'neutral', main_goal:['get_bookings','build_awareness'], primary_button_text:['get_in_touch','request_a_quote']},
  },
  accounting_and_legal: {
    accounting_and_finance: {personality:['professional_expert','prestigious_luxurious'], theme:'contemporary', visual_density:'balanced', color_palette:'neutral', main_goal:['get_bookings','build_awareness'], primary_button_text:['get_in_touch','request_a_quote']},
    legal_services: {personality:['professional_expert','prestigious_luxurious'], theme:'contemporary', visual_density:'balanced', color_palette:'neutral', main_goal:['get_bookings','build_awareness'], primary_button_text:['get_in_touch','request_a_quote']},
    compliance_and_administration: {personality:['professional_expert','prestigious_luxurious'], theme:'contemporary', visual_density:'balanced', color_palette:'neutral', main_goal:['get_bookings','build_awareness'], primary_button_text:['get_in_touch','request_a_quote']},
  },
  it_and_software: {
    development: {personality:['professional_expert','playful_whimsical'], theme:'modern', visual_density:'balanced', color_palette:'neutral', main_goal:['get_bookings','build_awareness'], primary_button_text:['get_in_touch','request_a_quote']},
    infrastructure_and_support: {personality:['professional_expert','playful_whimsical'], theme:'modern', visual_density:'balanced', color_palette:'neutral', main_goal:['get_bookings','build_awareness'], primary_button_text:['get_in_touch','request_a_quote']},
    business_systems: {personality:['professional_expert','playful_whimsical'], theme:'modern', visual_density:'balanced', color_palette:'neutral', main_goal:['get_bookings','build_awareness'], primary_button_text:['get_in_touch','request_a_quote']},
    training: {personality:['professional_expert','playful_whimsical'], theme:'modern', visual_density:'balanced', color_palette:'neutral', main_goal:['get_bookings','build_awareness'], primary_button_text:['get_in_touch','request_a_quote']},
  },
  marketing_and_communications: {
    strategy_and_branding: {personality:['rebellious_edgy','playful_whimsical'], theme:'contemporary', visual_density:'rich', color_palette:'vibrant', main_goal:['build_awareness','get_bookings'], primary_button_text:['get_in_touch','view_products']},
    content_and_copy: {personality:['rebellious_edgy','playful_whimsical'], theme:'contemporary', visual_density:'rich', color_palette:'vibrant', main_goal:['build_awareness','get_bookings'], primary_button_text:['get_in_touch','view_products']},
    social_and_community: {personality:['rebellious_edgy','playful_whimsical'], theme:'contemporary', visual_density:'rich', color_palette:'vibrant', main_goal:['build_awareness','get_bookings'], primary_button_text:['get_in_touch','view_products']},
    design_and_print: {personality:['rebellious_edgy','playful_whimsical'], theme:'contemporary', visual_density:'rich', color_palette:'vibrant', main_goal:['build_awareness','get_bookings'], primary_button_text:['get_in_touch','view_products']},
    pr_and_advertising: {personality:['rebellious_edgy','playful_whimsical'], theme:'contemporary', visual_density:'rich', color_palette:'vibrant', main_goal:['build_awareness','get_bookings'], primary_button_text:['get_in_touch','view_products']},
    specialist: {personality:['rebellious_edgy','playful_whimsical'], theme:'contemporary', visual_density:'rich', color_palette:'vibrant', main_goal:['build_awareness','get_bookings'], primary_button_text:['get_in_touch','view_products']},
  },
  health: {
    primary_and_general_care: {personality:['professional_expert','personal_intimate'], theme:'contemporary', visual_density:'balanced', color_palette:'ocean', main_goal:['get_bookings','get_whatsapp_messages'], primary_button_text:['book_now','call_us']},
    dental: {personality:['professional_expert','personal_intimate'], theme:'contemporary', visual_density:'balanced', color_palette:'ocean', main_goal:['get_bookings','get_whatsapp_messages'], primary_button_text:['book_now','call_us']},
    allied_health: {personality:['professional_expert','personal_intimate'], theme:'contemporary', visual_density:'balanced', color_palette:'ocean', main_goal:['get_bookings','get_whatsapp_messages'], primary_button_text:['book_now','call_us']},
    mental_health: {personality:['personal_intimate','friendly_approachable'], theme:'contemporary', visual_density:'balanced', color_palette:'pastel', main_goal:['get_bookings','get_whatsapp_messages'], primary_button_text:['book_now','get_in_touch']},
    alternative_and_complementary: {personality:['personal_intimate','friendly_approachable'], theme:'contemporary', visual_density:'balanced', color_palette:'pastel', main_goal:['get_bookings','get_whatsapp_messages'], primary_button_text:['book_now','get_in_touch']},
    specialist_and_community_health: {personality:['professional_expert','personal_intimate'], theme:'contemporary', visual_density:'balanced', color_palette:'ocean', main_goal:['get_bookings','get_whatsapp_messages'], primary_button_text:['book_now','call_us']},
  },
  wellness_and_fitness: {
    physical_training: {personality:['playful_whimsical','friendly_approachable'], theme:'contemporary', visual_density:'balanced', color_palette:'vibrant', main_goal:['get_bookings','drive_foot_traffic'], primary_button_text:['book_now','whatsapp_us']},
    mind_and_body: {personality:['personal_intimate','friendly_approachable'], theme:'contemporary', visual_density:'balanced', color_palette:'pastel', main_goal:['get_bookings','get_whatsapp_messages'], primary_button_text:['book_now','get_in_touch']},
    holistic_and_energy: {personality:['personal_intimate','friendly_approachable'], theme:'contemporary', visual_density:'balanced', color_palette:'pastel', main_goal:['get_bookings','get_whatsapp_messages'], primary_button_text:['book_now','get_in_touch']},
    coaching_and_lifestyle: {personality:['playful_whimsical','friendly_approachable'], theme:'contemporary', visual_density:'balanced', color_palette:'vibrant', main_goal:['get_bookings','drive_foot_traffic'], primary_button_text:['book_now','whatsapp_us']},
  },
  beauty_and_personal_care: {
    hair: {personality:['prestigious_luxurious','personal_intimate'], theme:'contemporary', visual_density:'rich', color_palette:'pastel', main_goal:['get_bookings','get_whatsapp_messages'], primary_button_text:['book_now','whatsapp_us']},
    skin_and_body: {personality:['prestigious_luxurious','personal_intimate'], theme:'contemporary', visual_density:'rich', color_palette:'pastel', main_goal:['get_bookings','get_whatsapp_messages'], primary_button_text:['book_now','whatsapp_us']},
    nails: {personality:['prestigious_luxurious','personal_intimate'], theme:'contemporary', visual_density:'rich', color_palette:'pastel', main_goal:['get_bookings','get_whatsapp_messages'], primary_button_text:['book_now','whatsapp_us']},
    specialist: {personality:['prestigious_luxurious','personal_intimate'], theme:'contemporary', visual_density:'rich', color_palette:'pastel', main_goal:['get_bookings','get_whatsapp_messages'], primary_button_text:['book_now','whatsapp_us']},
  },
  education_and_training: {
    academic_support: {personality:['professional_expert','friendly_approachable'], theme:'modern', visual_density:'balanced', color_palette:'neutral', main_goal:['get_bookings','build_awareness'], primary_button_text:['get_in_touch','request_a_quote']},
    skills_and_vocational: {personality:['professional_expert','friendly_approachable'], theme:'modern', visual_density:'balanced', color_palette:'neutral', main_goal:['get_bookings','build_awareness'], primary_button_text:['get_in_touch','request_a_quote']},
    creative_and_physical: {personality:['professional_expert','friendly_approachable'], theme:'modern', visual_density:'balanced', color_palette:'neutral', main_goal:['get_bookings','build_awareness'], primary_button_text:['get_in_touch','request_a_quote']},
    language: {personality:['professional_expert','friendly_approachable'], theme:'modern', visual_density:'balanced', color_palette:'neutral', main_goal:['get_bookings','build_awareness'], primary_button_text:['get_in_touch','request_a_quote']},
    business_and_professional: {personality:['professional_expert','friendly_approachable'], theme:'modern', visual_density:'balanced', color_palette:'neutral', main_goal:['get_bookings','build_awareness'], primary_button_text:['get_in_touch','request_a_quote']},
    early_childhood: {personality:['professional_expert','friendly_approachable'], theme:'modern', visual_density:'balanced', color_palette:'neutral', main_goal:['get_bookings','build_awareness'], primary_button_text:['get_in_touch','request_a_quote']},
    stem_and_tech: {personality:['professional_expert','friendly_approachable'], theme:'modern', visual_density:'balanced', color_palette:'neutral', main_goal:['get_bookings','build_awareness'], primary_button_text:['get_in_touch','request_a_quote']},
  },
  creative_and_media: {
    photography_and_video: {personality:['rebellious_edgy','craft_artisanal'], theme:'contemporary', visual_density:'rich', color_palette:'jewel_tone', main_goal:['build_awareness','get_bookings'], primary_button_text:['get_in_touch','view_products']},
    audio: {personality:['rebellious_edgy','craft_artisanal'], theme:'contemporary', visual_density:'rich', color_palette:'jewel_tone', main_goal:['build_awareness','get_bookings'], primary_button_text:['get_in_touch','view_products']},
    design_and_art: {personality:['rebellious_edgy','craft_artisanal'], theme:'contemporary', visual_density:'rich', color_palette:'jewel_tone', main_goal:['build_awareness','get_bookings'], primary_button_text:['get_in_touch','view_products']},
    writing_and_publishing: {personality:['rebellious_edgy','craft_artisanal'], theme:'contemporary', visual_density:'rich', color_palette:'jewel_tone', main_goal:['build_awareness','get_bookings'], primary_button_text:['get_in_touch','view_products']},
    craft_and_making: {personality:['rebellious_edgy','craft_artisanal'], theme:'contemporary', visual_density:'rich', color_palette:'jewel_tone', main_goal:['build_awareness','get_bookings'], primary_button_text:['get_in_touch','view_products']},
    spatial_and_experience: {personality:['rebellious_edgy','craft_artisanal'], theme:'contemporary', visual_density:'rich', color_palette:'jewel_tone', main_goal:['build_awareness','get_bookings'], primary_button_text:['get_in_touch','view_products']},
  },
  hospitality_and_events: {
    accommodation: {personality:['prestigious_luxurious','playful_whimsical'], theme:'contemporary', visual_density:'rich', color_palette:'jewel_tone', main_goal:['get_bookings','drive_foot_traffic'], primary_button_text:['book_now','whatsapp_us']},
    food_and_drink: {personality:['prestigious_luxurious','playful_whimsical'], theme:'contemporary', visual_density:'rich', color_palette:'jewel_tone', main_goal:['get_bookings','drive_foot_traffic'], primary_button_text:['book_now','whatsapp_us']},
    events_and_entertainment: {personality:['prestigious_luxurious','playful_whimsical'], theme:'contemporary', visual_density:'rich', color_palette:'jewel_tone', main_goal:['get_bookings','drive_foot_traffic'], primary_button_text:['book_now','whatsapp_us']},
    tourism: {personality:['prestigious_luxurious','playful_whimsical'], theme:'contemporary', visual_density:'rich', color_palette:'jewel_tone', main_goal:['get_bookings','drive_foot_traffic'], primary_button_text:['book_now','whatsapp_us']},
    support_services: {personality:['prestigious_luxurious','playful_whimsical'], theme:'contemporary', visual_density:'rich', color_palette:'jewel_tone', main_goal:['get_bookings','drive_foot_traffic'], primary_button_text:['book_now','whatsapp_us']},
  },
  real_estate: {
    agency_and_sales: {personality:['prestigious_luxurious','professional_expert'], theme:'modern', visual_density:'rich', color_palette:'neutral', main_goal:['get_bookings','build_awareness'], primary_button_text:['request_a_quote','get_in_touch']},
    management: {personality:['prestigious_luxurious','professional_expert'], theme:'modern', visual_density:'rich', color_palette:'neutral', main_goal:['get_bookings','build_awareness'], primary_button_text:['request_a_quote','get_in_touch']},
    development_and_investment: {personality:['prestigious_luxurious','professional_expert'], theme:'modern', visual_density:'rich', color_palette:'neutral', main_goal:['get_bookings','build_awareness'], primary_button_text:['request_a_quote','get_in_touch']},
    support_services: {personality:['prestigious_luxurious','professional_expert'], theme:'modern', visual_density:'rich', color_palette:'neutral', main_goal:['get_bookings','build_awareness'], primary_button_text:['request_a_quote','get_in_touch']},
  },
  agriculture: {
    farming: {personality:['craft_artisanal','friendly_approachable'], theme:'heritage', visual_density:'balanced', color_palette:'earthy', main_goal:['get_whatsapp_messages','build_awareness'], primary_button_text:['get_in_touch','whatsapp_us']},
    agri_business: {personality:['craft_artisanal','friendly_approachable'], theme:'heritage', visual_density:'balanced', color_palette:'earthy', main_goal:['get_whatsapp_messages','build_awareness'], primary_button_text:['get_in_touch','whatsapp_us']},
    support_services: {personality:['craft_artisanal','friendly_approachable'], theme:'heritage', visual_density:'balanced', color_palette:'earthy', main_goal:['get_whatsapp_messages','build_awareness'], primary_button_text:['get_in_touch','whatsapp_us']},
  },
  manufacturing_and_wholesale: {
    food_and_beverage: {personality:['professional_expert'], theme:'modern', visual_density:'dense', color_palette:'neutral', main_goal:['get_bookings','build_awareness'], primary_button_text:['request_a_quote','get_in_touch']},
    goods_and_products: {personality:['professional_expert'], theme:'modern', visual_density:'dense', color_palette:'neutral', main_goal:['get_bookings','build_awareness'], primary_button_text:['request_a_quote','get_in_touch']},
    trade: {personality:['professional_expert'], theme:'modern', visual_density:'dense', color_palette:'neutral', main_goal:['get_bookings','build_awareness'], primary_button_text:['request_a_quote','get_in_touch']},
  },
  animals_and_pets: {
    care_and_services: {personality:['friendly_approachable','playful_whimsical'], theme:'contemporary', visual_density:'balanced', color_palette:'pastel', main_goal:['get_bookings','get_whatsapp_messages'], primary_button_text:['book_now','whatsapp_us']},
    training_and_activity: {personality:['friendly_approachable','playful_whimsical'], theme:'contemporary', visual_density:'balanced', color_palette:'pastel', main_goal:['get_bookings','get_whatsapp_messages'], primary_button_text:['book_now','whatsapp_us']},
    specialist: {personality:['friendly_approachable','playful_whimsical'], theme:'contemporary', visual_density:'balanced', color_palette:'pastel', main_goal:['get_bookings','get_whatsapp_messages'], primary_button_text:['book_now','whatsapp_us']},
    retail_and_products: {personality:['friendly_approachable','playful_whimsical'], theme:'contemporary', visual_density:'balanced', color_palette:'pastel', main_goal:['get_bookings','get_whatsapp_messages'], primary_button_text:['book_now','whatsapp_us']},
  },
  sustainable_and_energy: {
    energy: {personality:['professional_expert','craft_artisanal'], theme:'modern', visual_density:'balanced', color_palette:'earthy', main_goal:['build_awareness','get_bookings'], primary_button_text:['get_in_touch','request_a_quote']},
    waste_and_recycling: {personality:['professional_expert','craft_artisanal'], theme:'modern', visual_density:'balanced', color_palette:'earthy', main_goal:['build_awareness','get_bookings'], primary_button_text:['get_in_touch','request_a_quote']},
    environment_and_compliance: {personality:['professional_expert','craft_artisanal'], theme:'modern', visual_density:'balanced', color_palette:'earthy', main_goal:['build_awareness','get_bookings'], primary_button_text:['get_in_touch','request_a_quote']},
  },
  community_and_non_profit: {
    social_services: {personality:['personal_intimate','friendly_approachable'], theme:'contemporary', visual_density:'balanced', color_palette:'warm', main_goal:['build_awareness','get_whatsapp_messages'], primary_button_text:['get_in_touch','whatsapp_us']},
    health_and_wellbeing: {personality:['personal_intimate','friendly_approachable'], theme:'contemporary', visual_density:'balanced', color_palette:'warm', main_goal:['build_awareness','get_whatsapp_messages'], primary_button_text:['get_in_touch','whatsapp_us']},
    youth_and_education: {personality:['personal_intimate','friendly_approachable'], theme:'contemporary', visual_density:'balanced', color_palette:'warm', main_goal:['build_awareness','get_whatsapp_messages'], primary_button_text:['get_in_touch','whatsapp_us']},
    community_and_culture: {personality:['personal_intimate','friendly_approachable'], theme:'contemporary', visual_density:'balanced', color_palette:'warm', main_goal:['build_awareness','get_whatsapp_messages'], primary_button_text:['get_in_touch','whatsapp_us']},
    faith_and_civic: {personality:['personal_intimate','friendly_approachable'], theme:'contemporary', visual_density:'balanced', color_palette:'warm', main_goal:['build_awareness','get_whatsapp_messages'], primary_button_text:['get_in_touch','whatsapp_us']},
    environment_and_animals: {personality:['personal_intimate','friendly_approachable'], theme:'contemporary', visual_density:'balanced', color_palette:'warm', main_goal:['build_awareness','get_whatsapp_messages'], primary_button_text:['get_in_touch','whatsapp_us']},
  },
  other: {
    other: {personality:['friendly_approachable'], theme:'contemporary', visual_density:'balanced', color_palette:'neutral', main_goal:['build_awareness'], primary_button_text:['get_in_touch']},
  },
};

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const DAY_LABELS = {monday:'Monday',tuesday:'Tuesday',wednesday:'Wednesday',thursday:'Thursday',friday:'Friday',saturday:'Saturday',sunday:'Sunday'};

// ── Look & Feel preview data ────────────────────────────────────────────────

const TYPOGRAPHY_FONTS = {
  serif: {family:"Georgia, 'Times New Roman', serif", weight:400, style:'normal'},
  sans: {family:"'DM Sans', -apple-system, 'Segoe UI', sans-serif", weight:400, style:'normal'},
  expressive: {family:"'Syne', -apple-system, sans-serif", weight:700, style:'normal'},
  handwritten: {family:"'Segoe Script', 'Bradley Hand', cursive", weight:400, style:'normal'},
  heavy_bold: {family:"'Syne', -apple-system, sans-serif", weight:800, style:'normal'},
  fine_hairline: {family:"'DM Sans', -apple-system, sans-serif", weight:300, style:'normal'},
  monospace: {family:"'DM Mono', 'Courier New', monospace", weight:400, style:'normal'},
  slab_serif: {family:"'Roboto Slab', Rockwell, serif", weight:700, style:'normal'},
  rounded: {family:"'Quicksand', 'Segoe UI Rounded', -apple-system, sans-serif", weight:600, style:'normal'},
};

const PALETTE_SWATCHES = {
  neutral: [{hex:'#E8E2D6'}, {hex:'#FAF8F3'}, {hex:'#2B2B26'}, {hex:'#D6CFC0'}, {hex:'#C9C0B0'}, {hex:'#F0EBDF'}, {hex:'#3D3A33'}, {hex:'#ADA695'}],
  warm: [{hex:'#BEAE9D'}, {hex:'#D0C2A4'}, {hex:'#E2D4B1'}, {hex:'#E5CAAE'}, {hex:'#C3A89D'}],
  pastel: [{hex:'#F7D6E0'}, {hex:'#CDE7F0'}, {hex:'#FDF3D0'}, {hex:'#DCEBD8'}, {hex:'#E5D4F0'}, {hex:'#FCE1D6'}, {hex:'#D4F0E8'}, {hex:'#E8D9F5'}],
  vibrant: [{hex:'#4B9CD3'}, {hex:'#F76B1C'}, {hex:'#8E3A9A'}, {hex:'#A0E0D3'}, {hex:'#2E3A25'}],
  monochrome: [{hex:'#F5F5F5'}, {hex:'#D4D4D4'}, {hex:'#B0B0B0'}, {hex:'#808080'}, {hex:'#4A4A4A'}, {hex:'#2D2D2D'}, {hex:'#1A1A1A'}, {hex:'#0D0D0D'}],
  earthy: [{hex:'#7C4B4B'}, {hex:'#A85E4D'}, {hex:'#D19980'}, {hex:'#F1D6C1'}, {hex:'#E7C9B1'}],
  ocean: [{hex:'#CAE9FF'}, {hex:'#A6D8F0'}, {hex:'#5FA8D3'}, {hex:'#62B6CB'}, {hex:'#2E86AB'}, {hex:'#1B4965'}, {hex:'#0D2C40'}, {hex:'#7FCDCD'}],
  jewel_tone: [{hex:'#C41E3A'}, {hex:'#6A0DAD'}, {hex:'#003153'}, {hex:'#046A38'}, {hex:'#B8860B'}, {hex:'#8B0A50'}, {hex:'#0F4C81'}, {hex:'#7B2D8E'}],
  muted: [{hex:'#B7A99A'}, {hex:'#94A89A'}, {hex:'#8E9AAF'}, {hex:'#A8A29E'}, {hex:'#9CA695'}, {hex:'#A79B8E'}, {hex:'#8C9296'}, {hex:'#B0A8A0'}],
};

// Small structural diagrams (plain divs, no external assets) representing each layout pattern.
const LAYOUT_PREVIEWS = {
  structured_grid: '<div class="lprev lprev-grid"><i></i><i></i><i></i><i></i><i></i><i></i></div>',
  magazine_editorial: '<div class="lprev lprev-mag"><i class="w"></i><i class="n"></i><i class="n"></i></div>',
  card_based: '<div class="lprev lprev-cards"><i></i><i></i><i></i><i></i></div>',
  immersive_full_bleed: '<div class="lprev lprev-bleed"><i></i></div>',
  single_column_longform: '<div class="lprev lprev-single"><i></i><i></i><i></i></div>',
  data_dense_dashboard: '<div class="lprev lprev-dash"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>',
  asymmetric_deconstructed: '<div class="lprev lprev-asym"><i class="a"></i><i class="b"></i><i class="c"></i></div>',
  raw_brutalist: '<div class="lprev lprev-raw"><i></i><i></i></div>',
};

function renderPreview(kind, val){
  if(!val) return '';
  if(kind==='typography'){
    const f = TYPOGRAPHY_FONTS[val]; if(!f) return '';
    return `<div class="type-preview" style="font-family:${f.family};font-weight:${f.weight};font-style:${f.style}">The quick brown fox jumps over the lazy dog</div>`;
  }
  if(kind==='palette'){
    if(val==='custom') return renderCustomColorPicker();
    const pool = PALETTE_SWATCHES[val]; if(!pool) return '';
    const shown = currentPaletteSelection(val);
    const canRegenerate = pool.length > shown.length;
    return `<div class="palette-strip">${shown.map(c=>`<div class="pswatch" style="background:${c}" title="${c}"></div>`).join('')}</div>
    <div class="palette-hexrow">${shown.map(c=>`<span>${ev(c)}</span>`).join('')}</div>
    ${canRegenerate?`<button class="btn" type="button" onclick="regeneratePaletteSwatches()" style="margin-top:8px">\u21bb Show different ${PALETTE_LABELS[val]||''} shades</button>`:''}`;
  }
  if(kind==='layout'){
    return LAYOUT_PREVIEWS[val] || '';
  }
  return '';
}

const PALETTE_LABELS = {neutral:'Neutral', warm:'Warm', pastel:'Pastel', vibrant:'Vibrant', monochrome:'Monochrome', earthy:'Earthy', ocean:'Ocean', jewel_tone:'Jewel Tone', muted:'Muted'};

// Returns the 4 hex colors currently being shown for a given palette, lazily
// picking the first 4 from that palette's pool the first time it's viewed.
function currentPaletteSelection(val){
  const sel = S.look_feel.palette_swatch_selection;
  if(sel && sel.key===val && sel.colors && sel.colors.length) return sel.colors;
  const pool = PALETTE_SWATCHES[val] || [];
  const colors = pool.slice(0,4).map(c=>c.hex);
  S.look_feel.palette_swatch_selection = {key:val, colors};
  return colors;
}

// Picks a different random 4-color subset from the same palette's pool, so
// someone who doesn't like the first 4 shown can see other shades in that
// same family without switching to a whole different palette category.
function regeneratePaletteSwatches(){
  const val = S.look_feel.color_palette;
  const pool = PALETTE_SWATCHES[val] || [];
  if(pool.length<=4){ toast('No other shades available for this palette'); return; }
  const current = currentPaletteSelection(val);
  let attempt, tries = 0;
  do{
    attempt = [...pool].sort(()=>Math.random()-0.5).slice(0,4).map(c=>c.hex);
    tries++;
  }while(tries<10 && JSON.stringify(attempt)===JSON.stringify(current));
  S.look_feel.palette_swatch_selection = {key:val, colors:attempt};
  renderStep(currentStep);
}

function renderCustomColorPicker(){
  if(!S.look_feel.custom_palette_colors) S.look_feel.custom_palette_colors = [];
  const colors = S.look_feel.custom_palette_colors;
  const atMax = colors.length>=4;
  return `<div class="custom-palette-wrap">
    <div class="custom-palette-picker-row">
      <input type="color" class="custom-palette-picker" id="custom-palette-active-picker" value="#8E3A9A">
      <button class="btn btn-save" type="button" onclick="addPickedColor()" ${atMax?'disabled':''}>+ Add this color</button>
    </div>
    ${colors.length?`<div class="custom-palette-swatches">${colors.map((c,i)=>`
      <div class="custom-palette-item">
        <input type="color" value="${ev(c)}" onchange="updCustomPaletteColor(${i},this.value)">
        <span class="custom-palette-hex">${ev(c)}</span>
        <button class="custom-palette-remove" type="button" onclick="removeCustomPaletteColor(${i})" title="Remove this color">\u00d7</button>
      </div>`).join('')}
    </div>`:''}
    <div class="custom-palette-hint">${atMax?'Maximum of 4 colors reached.':`${colors.length}/4 colors picked \u2014 aim for at least 3.`}</div>
  </div>`;
}

function addPickedColor(){
  const picker = el('custom-palette-active-picker');
  if(!picker) return;
  if(!S.look_feel.custom_palette_colors) S.look_feel.custom_palette_colors = [];
  if(S.look_feel.custom_palette_colors.length>=4) return;
  S.look_feel.custom_palette_colors.push(picker.value);
  renderStep(currentStep);
}

function updCustomPaletteColor(i, hex){
  S.look_feel.custom_palette_colors[i] = hex;
  renderStep(currentStep);
}

function removeCustomPaletteColor(i){
  if(!S.look_feel.custom_palette_colors) return;
  S.look_feel.custom_palette_colors.splice(i,1);
  renderStep(currentStep);
}

// ── Step & field definitions ────────────────────────────────────────────────

const STEPS = [
  {
    key: 'business', num: 1, title: 'The Business',
    desc: 'Tell us about your business, how customers can reach you, and what you offer.',
    fields: [
      {key:'request_type', label:'What kind of website project is this?', type:'buttons', required:true, full:true, opts:[
        {v:'new', l:'New', d:'Build a brand new website from scratch'},
        {v:'modify', l:'Modify', d:'Update or redesign an existing website'},
        {v:'other', l:'Other', d:'Something else — explain in the notes at the end'},
      ]},
      {key:'company_name', label:'What is your company\u2019s name?', type:'text', required:true, placeholder:'e.g. Sunrise Bakery'},
      {key:'company_do', label:'What does your company do?', type:'cascade', full:true,
        desc:'Select the category, subcategory, and specific type that best describes your business.',
        subfields:[
          {key:'category', label:'Category', type:'select', required:true, emptyLabel:'Category', opts:Object.entries(CATEGORIES).map(([v,c])=>({v,l:c.label}))},
          {key:'subcategory', label:'Subcategory', type:'select', required:true, emptyLabel:'Subcategory', dynamicOpts:'subcategory', showIf:s=>!!s.business.category},
          {key:'business_type', label:'What type of business is it?', type:'select', required:true, emptyLabel:'Business type', dynamicOpts:'business_type', showIf:s=>!!s.business.category && !!s.business.subcategory},
        ]},
      {key:'contact_details', label:'How can customers contact you?', type:'group', full:true, subfields:[
        {key:'phone', label:'Company Phone', type:'tel', placeholder:'Company phone number'},
        {key:'whatsapp', label:'WhatsApp Number', type:'tel', placeholder:'WhatsApp number'},
        {key:'email', label:'Email', type:'email', placeholder:'Email address'},
      ]},
      {key:'location', label:'Where is your business located?', type:'group', full:true, subfields:[
        {key:'street_address', label:'Street and number', type:'text', placeholder:'Street and number'},
        {key:'suburb', label:'Suburb', type:'text', placeholder:'Suburb'},
        {key:'province', label:'Province', type:'select', emptyLabel:'Province', opts:SA_PROVINCES.map(p=>({v:p,l:p}))},
      ]},
      {key:'price_positioning', label:'How would you describe your pricing?', type:'select', full:true, opts:[
        {v:'affordable', l:'Affordable / Everyday value'},
        {v:'mid_range', l:'Mid-range / Quality at fair price'},
        {v:'premium', l:'Premium'},
      ]},
      {key:'team_size', label:'How many people work at your business?', type:'number', placeholder:'e.g. 3'},
      {key:'years_in_business', label:'How many years has your business been operating?', type:'number', placeholder:'e.g. 5'},
      {key:'project_budget', label:'What is your budget for this website?', type:'select', full:true, opts:[
        {v:'starter', l:'Starter — R2,000–R4,000'},
        {v:'standard', l:'Standard — R4,000–R8,000'},
        {v:'premium', l:'Premium — R8,000–R12,000'},
        {v:'offer_based', l:'Offer based'},
      ]},
      {key:'payment_accepted', label:'Which payment methods do you accept?', type:'chips', full:true, opts:[
        {v:'eft',l:'EFT'},{v:'cash',l:'Cash'},{v:'snapscan',l:'SnapScan'},{v:'yoco',l:'Yoco'},{v:'card',l:'Card'},{v:'zapper',l:'Zapper'},
      ]},
      {key:'trading_hours', label:'What are your trading hours?', type:'hours', full:true},
    ]
  },
  {
    key: 'pages', num: 2, title: 'Pages',
    desc: 'Choose which pages your website should have. Home, About, and Products are recommended for most businesses.',
    fields: [
      {key:'selected_pages', label:'Which pages should your website have?', type:'chips', required:true, full:true, opts:[
        {v:'home', l:'Home (recommended)'},
        {v:'about', l:'About (recommended)'},
        {v:'products', l:'Products (recommended)'},
        {v:'services', l:'Services'},
        {v:'gallery', l:'Gallery'},
        {v:'booking', l:'Booking'},
        {v:'appointment', l:'Appointment'},
        {v:'online_shop', l:'Online Shop'},
        {v:'reservations', l:'Reservations'},
        {v:'contact_with_maps', l:'Contact (with Google Maps)'},
        {v:'contact_no_maps', l:'Contact (no Google Maps)'},
        {v:'reviews_testimonials', l:'Reviews / Testimonials'},
        {v:'faq', l:'FAQ'},
        {v:'pricing', l:'Pricing'},
        {v:'payment_system', l:'Payment System'},
        {v:'blog', l:'Blog'},
      ]},
      {key:'services_list', label:'List your services', type:'textarea', required:true, full:true,
        placeholder:'e.g. Haircuts, colouring, styling, bridal packages \u2014 one per line or separated by commas',
        showIf:s=>s.pages.selected_pages.includes('services')},
      {key:'products_list', label:'List your products', type:'textarea', required:true, full:true,
        placeholder:'e.g. Custom cakes, cupcakes, artisan bread \u2014 one per line or separated by commas',
        showIf:s=>s.pages.selected_pages.includes('products')},
    ]
  },
  {
    key: 'look_feel', num: 3, title: 'Look and Feel',
    desc: 'The visual style and tone of voice for your website.',
    fields: [
      {key:'personality', label:'What personality should your brand have?', type:'cards_multi', max:4, required:true, full:true,
        desc:'Select up to 4.', opts:[
        {v:'professional_expert', l:'Professional — Expert', d:'Competence-first; confident but not flashy'},
        {v:'prestigious_luxurious', l:'Prestigious — Luxurious', d:'Exclusivity, refinement, premium materials'},
        {v:'friendly_approachable', l:'Friendly — Approachable', d:'Warm, human, low intimidation'},
        {v:'playful_whimsical', l:'Playful — Whimsical', d:'Humor, surprise, delight-driven interactions'},
        {v:'rebellious_edgy', l:'Rebellious — Edgy', d:'Challenges convention; designed to provoke'},
        {v:'craft_artisanal', l:'Craft — Artisanal', d:'Handmade quality, slow-made, tactile values'},
        {v:'personal_intimate', l:'Personal — Intimate', d:'One-to-one tone; diary, studio, personal brand'},
      ]},
      {key:'typography', label:'What typography style do you prefer?', type:'select', required:true, full:true, preview:'typography', opts:[
        {v:'serif', l:'Serif', d:'Editorial refinement; trust and tradition'},
        {v:'sans', l:'Sans', d:'Clean neutrality; system-native clarity'},
        {v:'expressive', l:'Expressive', d:'Display as hero image; headline-driven layout'},
        {v:'handwritten', l:'Handwritten', d:'Script — human warmth; organic, personal'},
        {v:'heavy_bold', l:'Heavy / Bold', d:'Type at maximum weight; impact over subtlety'},
        {v:'fine_hairline', l:'Fine / Hairline', d:'Delicate weight; luxury or minimalist signal'},
        {v:'monospace', l:'Monospace', d:'Technical, code-native; every character equal width'},
        {v:'slab_serif', l:'Slab Serif', d:'Bold structural serifs; sturdy and modern-vintage'},
        {v:'rounded', l:'Rounded', d:'Soft geometric curves; approachable and friendly'},
      ]},
      {key:'dominant_screen', label:'Which device will most visitors use?', type:'select', full:true, opts:[
        {v:'mobile_basic', l:'Mobile Basic (Recommended)', d:'Optimised for simple mobile browsing'},
        {v:'mobile_big', l:'Mobile Big', d:'Larger mobile-first layouts with richer interaction'},
        {v:'laptop', l:'Laptop', d:'Optimised primarily for laptop viewing'},
        {v:'desktop', l:'Desktop', d:'Optimised primarily for large desktop viewing'},
      ]},
      {key:'layout', label:'What layout style do you prefer?', type:'select', required:true, full:true, preview:'layout', dynamicOpts:'layout_by_device', opts:[
        {v:'structured_grid', l:'Structured Grid', d:'Visible / implied column system; systematic alignment'},
        {v:'magazine_editorial', l:'Magazine Editorial', d:'Mixed column widths, pull quotes, varied text sizes'},
        {v:'card_based', l:'Card-based', d:'Discrete content units; grid of bounded items'},
        {v:'immersive_full_bleed', l:'Immersive — Full-bleed', d:'Media fills the viewport; UI overlaid on imagery'},
        {v:'single_column_longform', l:'Single-column — Longform', d:'Continuous vertical scroll; reading-focused'},
        {v:'data_dense_dashboard', l:'Data-dense — Dashboard', d:'Multiple data panels; functional over expressive'},
        {v:'asymmetric_deconstructed', l:'Asymmetric — Deconstructed', d:'Intentional imbalance; breaks grid conventions'},
        {v:'raw_brutalist', l:'Raw — Brutalist', d:'Unstyled-feeling; HTML-native or anti-design'},
      ]},
      {key:'interaction_style', label:'What kind of interactions or animations do you want?', type:'select', full:true, opts:[
        {v:'scroll_driven', l:'Scroll-driven', d:'Animations triggered or controlled by scroll position'},
        {v:'static_flat', l:'Static — Flat', d:'No animation; all interaction is navigation'},
        {v:'subtle_purposeful', l:'Subtle — Purposeful', d:'Micro-interactions only; motion serves function'},
        {v:'cinematic_theatrical', l:'Cinematic — Theatrical', d:'Large-scale transitions; sequences; directed attention'},
      ]},
      {key:'theme', label:'What visual theme fits your brand?', type:'select', required:true, full:true, opts:[
        {v:'heritage', l:'Heritage', d:'Pre-1920s craftsmanship, ornamental detail'},
        {v:'retro', l:'Retro', d:'1950s–70s shapes, muted palettes, organic curves'},
        {v:'contemporary', l:'Contemporary', d:'Current but not trend-chasing; feels of this decade'},
        {v:'modern', l:'Modern', d:'2010s–now; flat, systematic, UI-native'},
      ]},
      {key:'visual_density', label:'How much content should each page show at once?', type:'select', required:true, full:true, opts:[
        {v:'balanced', l:'Balanced', d:'Neither crowded nor empty; comfortable rhythm'},
        {v:'rich', l:'Rich', d:'Multiple content zones; imagery and text coexist'},
        {v:'dense', l:'Dense', d:'Every pixel used; high information load'},
      ]},
      {key:'color_palette', label:'Which color palette do you prefer?', type:'select', required:true, full:true, preview:'palette', opts:[
        {v:'neutral', l:'Neutral', d:'Beige, warm white, off-black; no dominant hue'},
        {v:'warm', l:'Warm', d:'Amber, terracotta, cream, rust'},
        {v:'pastel', l:'Pastel', d:'Soft — desaturated, light tints; gentle and low-contrast'},
        {v:'vibrant', l:'Vibrant', d:'Saturated — high chroma; colors at full intensity'},
        {v:'monochrome', l:'Monochrome', d:'Single hue in varying shades; minimal and cohesive'},
        {v:'earthy', l:'Earthy', d:'Natural greens and browns; grounded and organic'},
        {v:'ocean', l:'Ocean', d:'Cool blues and teals; calm and coastal'},
        {v:'jewel_tone', l:'Jewel Tone', d:'Rich saturated hues; luxurious and bold'},
        {v:'muted', l:'Muted', d:'Low-saturation tones; calm and understated'},
        {v:'custom', l:'Custom \u2014 Pick Your Own Colors', d:'Choose your own exact colors instead of a preset palette'},
      ]},
      {key:'custom_palette_colors', label:'Custom palette colors', type:'hidden_multi', hidden:true},
    ]
  },
  {
    key: 'audience', num: 4, title: 'Audience',
    desc: 'A quick picture of the people who will visit your website.',
    fields: [
      {key:'age_group', label:'What age group are your customers?', type:'chips', required:true, full:true, opts:[
        {v:'0_4',l:'0–4 (Infants/Toddlers)'},{v:'5_12',l:'5–12 (Children)'},{v:'13_17',l:'13–17 (Teenagers)'},
        {v:'18_24',l:'18–24 (Young Adults)'},{v:'25_34',l:'25–34 (Adults)'},{v:'35_44',l:'35–44 (Mid Adults)'},
        {v:'45_54',l:'45–54 (Middle-Aged)'},{v:'55_64',l:'55–64 (Pre-Seniors)'},{v:'65_74',l:'65–74 (Seniors)'},
        {v:'75_plus',l:'75+ (Elderly)'},{v:'all',l:'All'},
      ]},
      {key:'gender', label:'What is the gender of your typical customer?', type:'chips', required:true, full:true, opts:[
        {v:'male',l:'Male'},{v:'female',l:'Female'},{v:'non_binary',l:'Non-binary'},{v:'gender_fluid',l:'Gender-fluid'},
        {v:'transgender',l:'Transgender'},{v:'prefer_not_to_say',l:'Prefer not to say'},{v:'all',l:'All'},
      ]},
      {key:'area_type', label:'What type of area do your customers live in?', type:'select', required:true, opts:[
        {v:'urban',l:'Urban (large city)'},{v:'suburban',l:'Suburban'},{v:'small_town',l:'Small town'},
        {v:'rural',l:'Rural / Countryside'},{v:'remote',l:'Remote'},{v:'all',l:'All'},
      ]},
      {key:'customers_visit_location', label:'Do customers visit your business location?', type:'select', required:true, opts:[
        {v:'yes',l:'Yes'},{v:'no',l:'No'},{v:'by_appointment_only',l:'By appointment only'},
      ]},
      {key:'travel_to_customers', label:'Do you travel to your customers?', type:'select', required:true, opts:[
        {v:'yes',l:'Yes'},{v:'no',l:'No'},
      ]},
      {key:'service_locations', label:'Where do you provide your services?', type:'chips', required:true, full:true, opts:[
        {v:'at_business_location',l:'At my business location'},
        {v:'at_customer_location',l:'At the customer\u2019s location'},
        {v:'online',l:'Online'},
        {v:'nationwide',l:'Nationwide'},
        {v:'internationally',l:'Internationally'},
      ]},
    ]
  },
  {
    key: 'assets', num: 5, title: 'Assets & Visuals',
    desc: 'What logo, images, and copy do you already have — and what should we create for you?',
    fields: [
      {key:'logo_status', label:'Do you have a logo?', type:'select', required:true, full:true, opts:[
        {v:'ready_to_use', l:'I have a ready-to-use logo'},
        {v:'concept', l:'I have a concept / idea'},
        {v:'need_one', l:'Please make me a logo'},
      ]},
      {key:'logo_upload', label:'Upload your logo', type:'file', showIf:s=>s.assets.logo_status==='ready_to_use'},
      {key:'logo_concept_desc', label:'Describe your logo concept', type:'textarea', required:true, full:true,
        placeholder:'Colours, style, imagery, vibe — whatever you have in mind',
        showIf:s=>s.assets.logo_status==='concept'},
      {key:'logo_concept_upload', label:'Upload reference (optional)', type:'file',
        showIf:s=>s.assets.logo_status==='concept'},
      {key:'logo_preview', label:'Logo preview', type:'logo_preview', full:true,
        showIf:s=>s.assets.logo_status==='need_one'},
      {key:'selected_logo_url', label:'Selected logo', type:'hidden', hidden:true},
      {key:'images_status', label:'Do you have images or photos?', type:'chips', full:true, exclusiveOpts:['make_all'], opts:[
        {v:'ready_images', l:'I have ready-to-use images'},
        {v:'ready_photos', l:'I have ready-to-use photos'},
        {v:'ready_illustrations', l:'I have ready-to-use illustrations'},
        {v:'make_all', l:'Please make me all'},
      ]},
      {key:'images_preview', label:'Image preview', type:'images_preview', full:true,
        showIf:s=>s.assets.images_status.includes('make_all')},
      {key:'selected_image_urls', label:'Selected images', type:'hidden_multi', hidden:true},
      {key:'photo_owner', label:'Upload a photo of you or the business owner', type:'file',
        showIf:s=>['ready_images','ready_photos','ready_illustrations'].some(v=>s.assets.images_status.includes(v))},
      {key:'photo_front_shop', label:'Photo — front of shop', type:'file',
        showIf:s=>['ready_images','ready_photos','ready_illustrations'].some(v=>s.assets.images_status.includes(v))},
      {key:'photo_team', label:'Photo — team', type:'file',
        showIf:s=>['ready_images','ready_photos','ready_illustrations'].some(v=>s.assets.images_status.includes(v))},
      {key:'before_after', label:'Before-and-after photos', type:'group', full:true,
        desc:'Show the transformation you deliver — what it looked like before your work, and what it looked like after (e.g. a haircut, a garden makeover, a renovation).',
        showIf:s=>['ready_images','ready_photos','ready_illustrations'].some(v=>s.assets.images_status.includes(v)),
        subfields:[
          {key:'before_after_before_upload', label:'Before photo', type:'file'},
          {key:'before_after_after_upload', label:'After photo', type:'file'},
        ]},
      {key:'before_after_text', label:'Describe the results (optional)', type:'textarea', full:true,
        placeholder:'e.g. hair colour transformation, garden makeover, renovation — add context for the before-and-after photos',
        showIf:s=>['ready_images','ready_photos','ready_illustrations'].some(v=>s.assets.images_status.includes(v))},
      {key:'text_status', label:'Do you have text ready for your website?', type:'select', required:true, full:true, opts:[
        {v:'write_own', l:'I will write my own text'},
        {v:'have_draft', l:'I have draft text to provide'},
        {v:'write_for_me', l:'Please write everything for me'},
      ]},
      {key:'own_text_content', label:'Type or paste your text', type:'textarea', full:true,
        placeholder:'Write or paste your website copy here',
        showIf:s=>s.assets.text_status==='write_own'},
      {key:'own_text_upload', label:'Or upload a document instead', type:'file',
        showIf:s=>s.assets.text_status==='write_own'},
      {key:'text_upload', label:'Upload your draft text', type:'file', showIf:s=>s.assets.text_status==='have_draft'},
    ]
  },
  {
    key: 'cta', num: 6, title: 'Call to Action',
    desc: 'What you want visitors to do when they arrive on your website.',
    fields: [
      {key:'main_goal', label:'What is the main goal of your website?', type:'buttons_multi', max:2, required:true, full:true,
        desc:'Select up to 2.', opts:[
        {v:'get_whatsapp_messages', l:'Get WhatsApp messages'},
        {v:'drive_foot_traffic', l:'Drive foot traffic'},
        {v:'build_awareness', l:'Build awareness'},
        {v:'get_bookings', l:'Get bookings'},
      ]},
      {key:'hero_goals', label:'What should the top of your homepage achieve?', type:'select', full:true,
        desc:'This is the first thing visitors see when they land on your site.', opts:[
        {v:'explain_business', l:'Explain the business'},
        {v:'build_trust', l:'Build trust'},
        {v:'get_enquiries', l:'Get enquiries'},
        {v:'drive_bookings', l:'Drive bookings'},
        {v:'sell_product', l:'Sell a product'},
        {v:'build_brand_awareness', l:'Build brand awareness'},
      ]},
      {key:'primary_button_text', label:'What should your main button say?', type:'buttons_multi', max:2, required:true, full:true,
        desc:'Select up to 2.', opts:[
        {v:'whatsapp_us', l:'WhatsApp Us'},
        {v:'book_now', l:'Book Now'},
        {v:'get_in_touch', l:'Get in Touch'},
        {v:'view_products', l:'View Products'},
        {v:'call_us', l:'Call Us'},
        {v:'request_a_quote', l:'Request a Quote'},
        {v:'custom', l:'Custom…'},
      ]},
      {key:'custom_button_text', label:'Custom button text', type:'text', placeholder:'e.g. Order Now',
        showIf:s=>s.cta.primary_button_text.includes('custom')},
    ]
  },
  {
    key: 'trust', num: 7, title: 'Trust Signals',
    desc: 'Proof points that reassure visitors and build credibility.',
    fields: [
      {key:'signals', label:'What proof do you have to build trust with visitors?', type:'chips', required:true, full:true,
        desc:'Multi-select — tick all that apply.', opts:[
        {v:'customer_reviews', l:'Customer reviews'},
        {v:'testimonials', l:'Testimonials'},
        {v:'awards_certifications', l:'Awards & certificates'},
        {v:'client_logos', l:'Client logos'},
        {v:'statistics', l:'Statistics'},
        {v:'guarantees', l:'Guarantees'},
      ]},
      {key:'testimonials_list', label:'Testimonials (max 3)', type:'testimonials', max:3, full:true,
        desc:'Add the testimonial text and the name of the person who said it.',
        showIf:s=>s.trust.signals.includes('testimonials')},
      {key:'customer_reviews_text', label:'Customer reviews', type:'textarea', full:true,
        placeholder:'Paste your customer reviews here (e.g. from Google, Facebook)',
        showIf:s=>s.trust.signals.includes('customer_reviews')},
      {key:'customer_reviews_upload', label:'Upload review screenshots', type:'file',
        showIf:s=>s.trust.signals.includes('customer_reviews')},
      {key:'awards_certifications_text', label:'Awards & certificates', type:'textarea', full:true,
        placeholder:'List the awards and certifications you\u2019ve received',
        showIf:s=>s.trust.signals.includes('awards_certifications')},
      {key:'awards_certifications_upload', label:'Upload award badges / certificates', type:'file',
        showIf:s=>s.trust.signals.includes('awards_certifications')},
      {key:'client_logos_upload', label:'Upload client logos', type:'file',
        showIf:s=>s.trust.signals.includes('client_logos')},
      {key:'statistics_text', label:'Statistics', type:'textarea', full:true,
        placeholder:'e.g. 500+ happy customers, 98% satisfaction rate, 10 years experience',
        showIf:s=>s.trust.signals.includes('statistics')},
      {key:'guarantees_text', label:'Guarantees', type:'textarea', full:true,
        placeholder:'Describe your guarantee (e.g. 100% money-back guarantee)',
        showIf:s=>s.trust.signals.includes('guarantees')},
    ]
  },
  {
    key: 'final', num: 8, title: 'Final Details',
    desc: 'Which language(s) your website should be available in, and anything else we should know.',
    fields: [
      {key:'primary_language', label:'Primary language', type:'select', required:true,
        desc:'The main language your website will be written in by default.',
        opts:[
        {v:'en_us', l:'English (US)'},{v:'en_za', l:'English (ZA)'},{v:'en_uk', l:'English (UK)'},
        {v:'afrikaans', l:'Afrikaans'},
        {v:'zulu', l:'isiZulu'},
        {v:'xhosa', l:'isiXhosa'},
        {v:'ndebele', l:'isiNdebele'},
        {v:'sepedi', l:'Sepedi (Northern Sotho)'},
        {v:'sesotho', l:'Sesotho (Southern Sotho)'},
        {v:'setswana', l:'Setswana'},
        {v:'siswati', l:'siSwati'},
        {v:'tshivenda', l:'Tshivenda'},
        {v:'xitsonga', l:'Xitsonga'},
        {v:'other', l:'Other – specify'},
      ]},
      {key:'additional_languages', label:'Additional languages (optional)', type:'chips', full:true,
        desc:'Any other languages the website should also be available in — visitors will be able to switch between them (e.g. site is in English by default, switchable to isiZulu).',
        opts:[
        {v:'en_us', l:'English (US)'},{v:'en_za', l:'English (ZA)'},{v:'en_uk', l:'English (UK)'},
        {v:'afrikaans', l:'Afrikaans'},
        {v:'zulu', l:'isiZulu'},
        {v:'xhosa', l:'isiXhosa'},
        {v:'ndebele', l:'isiNdebele'},
        {v:'sepedi', l:'Sepedi (Northern Sotho)'},
        {v:'sesotho', l:'Sesotho (Southern Sotho)'},
        {v:'setswana', l:'Setswana'},
        {v:'siswati', l:'siSwati'},
        {v:'tshivenda', l:'Tshivenda'},
        {v:'xitsonga', l:'Xitsonga'},
        {v:'other', l:'Other – specify'},
      ]},
      {key:'other_language', label:'Specify other language', type:'text',
        showIf:s=>s.final.primary_language==='other' || s.final.additional_languages.includes('other')},
      {key:'anything_else', label:'Anything else we should know?', type:'textarea', full:true,
        placeholder:'Anything not covered above'},
    ]
  },
];

// ── State ────────────────────────────────────────────────────────────────

function emptyState(){
  const s = {};
  STEPS.forEach(step=>{
    s[step.key] = {};
    flattenStepFields(step).forEach(f=>{
      if(f.type==='chips' || f.type==='cards_multi' || f.type==='buttons_multi' || f.type==='hidden_multi') s[step.key][f.key] = [];
      else if(f.type==='products' || f.type==='testimonials') s[step.key][f.key] = [];
      else if(f.type==='hours') s[step.key][f.key] = Object.fromEntries(DAYS.map(d=>[d,{open:'',close:'',closed:false}]));
      else s[step.key][f.key] = '';
    });
  });
  // Recommended pages pre-selected (not locked — just a sensible starting point)
  s.pages.selected_pages = ['home','about','products'];
  return s;
}

let S = emptyState();
let currentStep = 0;

// ── Utilities ────────────────────────────────────────────────────────────

function el(id){ return document.getElementById(id); }
function ev(str){ return String(str==null?'':str).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function toast(msg){
  const t = el('toast'); if(!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(()=>t.classList.remove('show'), 2200);
}

function fieldForKey(stepKey, fieldKey){
  const step = STEPS.find(s=>s.key===stepKey);
  return step && step.fields.find(f=>f.key===fieldKey);
}

// Tier is derived from required flag: T1 = required, T2 = optional.
// (The original tier system was T1/T2/T3/custom across a much larger field
// library; with this smaller wizard field set, required/optional is the
// closest honest mapping — see conversation notes.)
// group/cascade wrapper fields (e.g. "Contact Details", "Your Company do")
// don't carry their own required flag — they derive it from their subfields.
function fieldRequired(f){
  if(f.type==='group' || f.type==='cascade') return f.subfields.some(sf=>sf.required);
  return !!f.required;
}
function fieldTier(f){ return fieldRequired(f) ? 'T1' : 'T2'; }

let settingMode = 'advanced';   // 'basic' | 'advanced' — mirrors the old Basic/Advanced settings toggle
let tierFilterVal = 'all';   // 'all' | 'T1' | 'T2'
let searchQuery = '';

function fieldLabelMatches(f, query){
  const q = query.toLowerCase();
  if(f.label.toLowerCase().includes(q)) return true;
  if((f.type==='group' || f.type==='cascade') && f.subfields.some(sf=>sf.label.toLowerCase().includes(q))) return true;
  return false;
}

function matchesFilters(f){
  if(settingMode==='basic' && !fieldRequired(f)) return false;
  if(tierFilterVal!=='all' && fieldTier(f)!==tierFilterVal) return false;
  if(searchQuery && !fieldLabelMatches(f, searchQuery)) return false;
  return true;
}

function visibleFields(step){
  return step.fields.filter(f=>(!f.showIf || f.showIf(S)) && matchesFilters(f));
}

// Flattens group/cascade wrapper fields into their real leaf subfields, for
// validation, progress, and JSON-building — logic that needs to look at
// actual data-bearing fields rather than the visual card grouping.
function flattenStepFields(step){
  const out = [];
  step.fields.forEach(f=>{
    if(f.type==='group' || f.type==='cascade') out.push(...f.subfields);
    else out.push(f);
  });
  return out;
}

function setSettingMode(val){
  settingMode = val;
  renderStep(currentStep);
}

function applyFilters(){
  searchQuery = el('q') ? el('q').value : '';
  tierFilterVal = el('tierFilter') ? el('tierFilter').value : 'all';
  renderStep(currentStep);
}

// Layouts that need more screen real estate than a phone gives — mixed columns,
// dense panels, and deliberate imbalance all read as clutter/broken on mobile.
const MOBILE_UNSUITABLE_LAYOUTS = ['magazine_editorial', 'data_dense_dashboard', 'asymmetric_deconstructed'];

function optsFor(field){
  if(field.dynamicOpts==='subcategory'){
    const cat = CATEGORIES[S.business.category];
    if(!cat) return [];
    return Object.entries(cat.subcategories).map(([v,s])=>({v,l:s.label}));
  }
  if(field.dynamicOpts==='business_type'){
    const cat = CATEGORIES[S.business.category];
    const sub = cat && cat.subcategories[S.business.subcategory];
    return sub ? sub.types : [];
  }
  if(field.dynamicOpts==='layout_by_device'){
    const screen = S.look_feel.dominant_screen;
    const isMobile = screen==='mobile_basic' || screen==='mobile_big';
    if(!isMobile) return field.opts;
    return field.opts.filter(o=>!MOBILE_UNSUITABLE_LAYOUTS.includes(o.v));
  }
  return field.opts || [];
}

// ── Field renderers ──────────────────────────────────────────────────────

function renderField(stepKey, f){
  const v = S[stepKey][f.key];
  const id = `f_${stepKey}_${f.key}`;
  let control = '';
  switch(f.type){
    case 'text':
      control = `<input type="text" id="${id}" placeholder="${ev(f.placeholder||'')}" value="${ev(v||'')}" oninput="updField('${stepKey}','${f.key}',this.value)">`;
      break;
    case 'tel':
      control = `<input type="tel" id="${id}" placeholder="${ev(f.placeholder||'')}" value="${ev(v||'')}" oninput="updField('${stepKey}','${f.key}',this.value)">`;
      break;
    case 'email':
      control = `<input type="email" id="${id}" placeholder="${ev(f.placeholder||'')}" value="${ev(v||'')}" oninput="updField('${stepKey}','${f.key}',this.value)">`;
      break;
    case 'number':
      control = `<input type="number" min="0" id="${id}" placeholder="${ev(f.placeholder||'')}" value="${v===''||v==null?'':v}" oninput="updField('${stepKey}','${f.key}',this.value)">`;
      break;
    case 'textarea': {
      const genBtn = (f.key==='services_list' || f.key==='products_list') ? renderTextGenButton(f.key) : '';
      control = `<textarea id="${id}" placeholder="${ev(f.placeholder||'')}" oninput="updField('${stepKey}','${f.key}',this.value)">${ev(v||'')}</textarea>${genBtn}`;
      break;
    }
    case 'select':
      control = renderSelect(stepKey, f, v) + (f.preview ? renderPreview(f.preview, v) : '');
      break;
    case 'buttons':
      control = renderPillButtons(stepKey, f, v);
      break;
    case 'buttons_multi':
      control = renderPillButtonsMulti(stepKey, f, v);
      break;
    case 'chips':
      control = renderChipsMulti(stepKey, f, v);
      break;
    case 'cards':
      control = renderCards(stepKey, f, v);
      break;
    case 'cards_multi':
      control = renderCardsMulti(stepKey, f, v);
      break;
    case 'hours':
      control = renderHours(stepKey, f);
      break;
    case 'products':
      control = renderProducts(stepKey, f);
      break;
    case 'testimonials':
      control = renderTestimonials(stepKey, f);
      break;
    case 'logo_preview':
      control = renderLogoPreview();
      break;
    case 'images_preview':
      control = renderImagesPreview();
      break;
    case 'file':
      control = renderFile(stepKey, f, v);
      break;
    case 'group':
    case 'cascade': {
      const cascadeSearch = (f.type==='cascade' && f.key==='company_do') ? `
        <div class="cascade-search-wrap">
          <input type="text" class="cascade-search-input" id="business_type_search" placeholder="Or search directly (e.g. bakery, salon, plumber)\u2026" oninput="filterBusinessTypeSearch(this.value)" autocomplete="off">
          <div class="cascade-search-results" id="business_type_search_results"></div>
        </div>` : '';
      control = `${cascadeSearch}<div class="subfield-stack">${f.subfields.filter(sf=>!sf.showIf || sf.showIf(S)).map(sf=>renderSubfieldControl(stepKey, sf)).join('')}</div>`;
      break;
    }
  }
  const tier = fieldTier(f);
  return `<div class="fc ${f.full?'f-full':''}" id="wrap_${id}">
    <div class="fhdr">
      <div class="flabel">${ev(f.label)}${fieldRequired(f)?' <span class="freq">*</span>':''}</div>
      <div class="fbadges">
        <span class="tbadge ${tier==='T1'?'t1b':'t2b'}">${tier}</span>
        <span class="typeb">${ev(f.type)}</span>
      </div>
    </div>
    ${f.desc?`<div class="fdesc">${ev(f.desc)}</div>`:''}
    ${control}
  </div>`;
}

// Renders a bare input/select control for a subfield living inside a
// 'group' or 'cascade' wrapper field — no .fc card of its own, since the
// parent group/cascade field already provides one shared card.
function renderSubfieldControl(stepKey, sf){
  const v = S[stepKey][sf.key];
  const id = `f_${stepKey}_${sf.key}`;
  switch(sf.type){
    case 'text':
      return `<input type="text" id="${id}" placeholder="${ev(sf.placeholder||'')}" value="${ev(v||'')}" oninput="updField('${stepKey}','${sf.key}',this.value)">`;
    case 'tel':
      return `<input type="tel" id="${id}" placeholder="${ev(sf.placeholder||'')}" value="${ev(v||'')}" oninput="updField('${stepKey}','${sf.key}',this.value)">`;
    case 'email':
      return `<input type="email" id="${id}" placeholder="${ev(sf.placeholder||'')}" value="${ev(v||'')}" oninput="updField('${stepKey}','${sf.key}',this.value)">`;
    case 'select':
      return renderSelect(stepKey, sf, v);
    case 'file':
      return `<div class="subfield-file"><div class="subfield-file-label">${ev(sf.label)}</div>${renderFile(stepKey, sf, v)}</div>`;
    default:
      return '';
  }
}

function renderSelect(stepKey, f, v){
  const opts = optsFor(f);
  const id = `f_${stepKey}_${f.key}`;
  return `<select id="${id}" onchange="selectField('${stepKey}','${f.key}',this.value)">
    <option value="">${ev(f.emptyLabel ? f.emptyLabel : 'Select…')}</option>
    ${opts.map(o=>`<option value="${ev(o.v)}"${v===o.v?' selected':''}>${ev(o.l)}</option>`).join('')}
  </select>`;
}

function renderPillButtons(stepKey, f, v){
  return `<div class="pillbtns">${f.opts.map(o=>
    `<div class="pillbtn ${v===o.v?'sel':''}" onclick="selectField('${stepKey}','${f.key}','${o.v}')">${ev(o.l)}</div>`
  ).join('')}</div>`;
}

function renderPillButtonsMulti(stepKey, f, v){
  const arr = Array.isArray(v) ? v : [];
  const atMax = arr.length >= f.max;
  const pills = f.opts.map(o=>{
    const sel = arr.includes(o.v);
    const blocked = atMax && !sel;
    return `<div class="pillbtn ${sel?'sel':''} ${blocked?'disabled':''}" onclick="${blocked?'':`toggleCardsMulti('${stepKey}','${f.key}','${o.v}',${f.max})`}">${ev(o.l)}</div>`;
  }).join('');
  return `<div class="pillbtns">${pills}</div><div class="rcard-count">${arr.length} / ${f.max} selected</div>`;
}

function renderChipsMulti(stepKey, f, v){
  const arr = Array.isArray(v)?v:[];
  return `<div class="chips">${f.opts.map(o=>
    `<div class="chip ${arr.includes(o.v)?'sel':''}" onclick="toggleMulti('${stepKey}','${f.key}','${o.v}')">${ev(o.l)}</div>`
  ).join('')}</div>`;
}

function renderCards(stepKey, f, v){
  return `<div class="rcard-grid">${f.opts.map(o=>
    `<div class="rcard ${v===o.v?'sel':''}" onclick="selectField('${stepKey}','${f.key}','${o.v}')">
      <div class="rcard-title">${ev(o.l)}</div>
      ${o.d?`<div class="rcard-desc">${ev(o.d)}</div>`:''}
    </div>`
  ).join('')}</div>`;
}

function renderCardsMulti(stepKey, f, v){
  const arr = Array.isArray(v) ? v : [];
  const atMax = arr.length >= f.max;
  return `<div class="rcard-grid">${f.opts.map(o=>{
    const sel = arr.includes(o.v);
    const blocked = atMax && !sel;
    return `<div class="rcard ${sel?'sel':''} ${blocked?'disabled':''}" onclick="${blocked?'':`toggleCardsMulti('${stepKey}','${f.key}','${o.v}',${f.max})`}">
      <div class="rcard-title">${ev(o.l)}</div>
      ${o.d?`<div class="rcard-desc">${ev(o.d)}</div>`:''}
    </div>`;
  }).join('')}</div>
  <div class="rcard-count">${arr.length} / ${f.max} selected</div>`;
}

function renderHours(stepKey, f){
  const hours = S[stepKey][f.key];
  return `<div class="hours-table">${DAYS.map(d=>{
    const day = hours[d] || {open:'',close:'',closed:false};
    const hasHours = !day.closed && day.open && day.close;
    let copyRow = '';
    if(d==='monday' && hasHours){
      copyRow = `<div class="hours-copy-row">
        <span class="hours-copy-lbl">Apply Monday\u2019s hours to:</span>
        <button class="btn" type="button" onclick="copyHoursToRange('${stepKey}','${f.key}','monday',['tuesday','wednesday','thursday','friday'])">Tue\u2013Fri</button>
        <button class="btn" type="button" onclick="copyHoursToRange('${stepKey}','${f.key}','monday',['tuesday','wednesday','thursday','friday','saturday','sunday'])">Tue\u2013Sun</button>
      </div>`;
    }
    if(d==='saturday' && hasHours){
      copyRow = `<div class="hours-copy-row">
        <span class="hours-copy-lbl">Apply Saturday\u2019s hours to:</span>
        <button class="btn" type="button" onclick="copyHoursToRange('${stepKey}','${f.key}','saturday',['sunday'])">Sunday</button>
      </div>`;
    }
    return `<div class="hours-row">
      <div class="hours-day">${DAY_LABELS[d]}</div>
      <input type="time" value="${ev(day.open)}" ${day.closed?'disabled':''} onchange="updHours('${stepKey}','${f.key}','${d}','open',this.value)">
      <input type="time" value="${ev(day.close)}" ${day.closed?'disabled':''} onchange="updHours('${stepKey}','${f.key}','${d}','close',this.value)">
      <div class="hours-closed-wrap">
        <label class="tgl"><input type="checkbox" ${day.closed?'checked':''} onchange="updHoursClosed('${stepKey}','${f.key}','${d}',this.checked)"><span class="tgl-s"></span></label>
        <span class="hours-closed-lbl">Closed</span>
      </div>
    </div>${copyRow}`;
  }).join('')}</div>`;
}

function copyHoursToRange(stepKey, key, sourceDay, targetDays){
  const source = S[stepKey][key][sourceDay];
  targetDays.forEach(d=>{ S[stepKey][key][d] = {...source}; });
  renderStep(currentStep);
  toast('Copied '+DAY_LABELS[sourceDay]+'\u2019s hours to '+targetDays.map(d=>DAY_LABELS[d]).join(', '));
}

function renderProducts(stepKey, f){
  const items = S[stepKey][f.key];
  const rows = items.map((item, i)=>`<div class="rep-item">
    <div class="rep-item-hdr">
      <div class="rep-item-title">Signature product ${i+1}</div>
      <div class="rep-remove" onclick="removeProduct('${stepKey}','${f.key}',${i})" title="Remove">×</div>
    </div>
    <input type="text" placeholder="Product name" value="${ev(item.name||'')}" oninput="updProduct('${stepKey}','${f.key}',${i},'name',this.value)">
    <textarea placeholder="Short description" oninput="updProduct('${stepKey}','${f.key}',${i},'description',this.value)">${ev(item.description||'')}</textarea>
    <div class="file-row">
      <input type="file" accept="image/*" id="prodfile_${stepKey}_${f.key}_${i}" onchange="updProductPhoto('${stepKey}','${f.key}',${i},this)">
      <button class="btn" type="button" onclick="document.getElementById('prodfile_${stepKey}_${f.key}_${i}').click()">Upload photo</button>
      <span class="file-name ${item.photo?'':'empty'}">${ev(item.photo||'No photo selected (optional)')}</span>
    </div>
  </div>`).join('');
  const addBtn = `<button class="btn rep-add" type="button" ${items.length>=3?'disabled':''} onclick="addProduct('${stepKey}','${f.key}')">+ Add signature product${items.length?'':' (max 3)'}</button>`;
  return `<div>${rows}${addBtn}</div>`;
}

function renderTestimonials(stepKey, f){
  const items = S[stepKey][f.key];
  const rows = items.map((item, i)=>`<div class="rep-item">
    <div class="rep-item-hdr">
      <div class="rep-item-title">Testimonial ${i+1}</div>
      <div class="rep-remove" onclick="removeTestimonial('${stepKey}','${f.key}',${i})" title="Remove">×</div>
    </div>
    <input type="text" placeholder="Name of the person" value="${ev(item.name||'')}" oninput="updTestimonial('${stepKey}','${f.key}',${i},'name',this.value)">
    <textarea placeholder="What did they say?" oninput="updTestimonial('${stepKey}','${f.key}',${i},'quote',this.value)">${ev(item.quote||'')}</textarea>
  </div>`).join('');
  const addBtn = `<button class="btn rep-add" type="button" ${items.length>=f.max?'disabled':''} onclick="addTestimonial('${stepKey}','${f.key}',${f.max})">+ Add testimonial${items.length?'':` (max ${f.max})`}</button>`;
  return `<div>${rows}${addBtn}</div>`;
}

// Logo generation isn't connected to an AI provider yet — this renders the intended
// UI/UX (two options + regenerate) so the interaction pattern is ready to wire up later.
let logoGenState = 'idle'; // 'idle' | 'generating'
let generatedLogoUrls = []; // populated after a real Recraft call returns
let imagesGenState = 'idle'; // 'idle' | 'generating'
let generatedImageUrls = []; // populated after a real Recraft call returns

// The structured slice of the client's own answers that's actually relevant to
// generating visuals — sent to Recraft as literal JSON inside the prompt, so
// generation is grounded in what they told us rather than a generic guess.
function buildBrandContextJSON(){
  const b = S.business, lf = S.look_feel;
  const cat = CATEGORIES[b.category];
  const sub = cat && cat.subcategories[b.subcategory];
  const businessType = (sub && sub.types.find(t=>t.v===b.business_type)?.l) || (sub && sub.label) || null;
  const lfStep = STEPS.find(s=>s.key==='look_feel');
  const personalityLabels = (lf.personality||[]).map(v=>{
    const opt = lfStep.fields.find(f=>f.key==='personality').opts.find(o=>o.v===v);
    return opt ? opt.l.replace(' — ',' ') : v;
  });
  const themeOpt = lf.theme && lfStep.fields.find(f=>f.key==='theme').opts.find(o=>o.v===lf.theme);
  const paletteOpt = lf.color_palette && lfStep.fields.find(f=>f.key==='color_palette').opts.find(o=>o.v===lf.color_palette);
  const hexValues = lf.color_palette==='custom'
    ? (lf.custom_palette_colors||[])
    : (lf.color_palette ? currentPaletteSelection(lf.color_palette) : []);
  const ctx = {
    company_name: b.company_name || null,
    business_type: businessType,
    price_positioning: b.price_positioning || null,
    brand_personality: personalityLabels.length ? personalityLabels : null,
    visual_theme: themeOpt ? { name: themeOpt.l, description: themeOpt.d } : null,
    color_palette: paletteOpt ? { name: paletteOpt.l, description: paletteOpt.d, hex_values: hexValues.length ? hexValues : undefined } : null,
  };
  // Drop empty keys so the prompt isn't cluttered with nulls
  Object.keys(ctx).forEach(k=>{ if(ctx[k]==null) delete ctx[k]; });
  if(ctx.color_palette && !ctx.color_palette.hex_values) delete ctx.color_palette.hex_values;
  return ctx;
}

// ── Services / products list generation (Claude) ──────────────────────────

let textGenState = {}; // fieldKey -> 'idle' | 'generating'

function renderTextGenButton(fieldKey){
  const generating = textGenState[fieldKey]==='generating';
  return `<button class="btn" type="button" ${generating?'disabled':''} onclick="generateListWithClaude('${fieldKey}')" style="margin-top:8px">${generating?'Generating\u2026':'Generate with AI'}</button>`;
}

function buildListPrompt(kind){
  const business = buildBrandContextJSON();
  const task = kind==='services'
    ? 'Suggest a realistic, well-scoped list of services this specific business likely offers, based on its business type.'
    : 'Suggest a realistic, well-scoped list of products this specific business likely sells, based on its business type.';
  return JSON.stringify({
    task,
    business,
    format: 'Return ONLY a plain list, one item per line, no numbering, no bullets, no markdown, no extra commentary before or after. Between 4 and 10 items, specific to this exact business type, written in South African English.',
  });
}

async function generateListWithClaude(fieldKey){
  if(typeof api !== 'function' || typeof detectApi !== 'function'){
    toast('This needs the connected engine (open this from the full app)');
    return;
  }
  textGenState[fieldKey] = 'generating';
  renderStep(currentStep);
  try{
    if(!(await detectApi())){
      toast('Can\u2019t reach the engine — is it running?');
      return;
    }
    const kind = fieldKey==='services_list' ? 'services' : 'products';
    const prompt = buildListPrompt(kind);
    const res = await api('/text/generate', {method:'POST', body: JSON.stringify({prompt})});
    if(res.simulated){
      toast('Claude isn\u2019t connected yet \u2014 add your API key under Integrations \u2192 Claude API');
    } else if(res.text && res.text.trim()){
      S.pages[fieldKey] = res.text.trim();
      toast('List generated \u2014 feel free to edit it');
    } else {
      toast('Claude didn\u2019t return anything \u2014 try again');
    }
  }catch(err){
    toast(err.message || 'Generation failed');
  }finally{
    textGenState[fieldKey] = 'idle';
    renderStep(currentStep);
  }
}

// Two genuinely different logo styles, not two variations of the same prompt —
// a combination mark (icon + text) and a text-only wordmark. Sent to Recraft as
// a JSON-structured prompt string: the client's own answers plus explicit
// design principles aimed at a clean, professional brand-mark result rather
// than a generic or cluttered illustration.
// Builds a short, comma-separated description of the business from the brand
// context — used to keep Recraft prompts compact. Recraft caps prompts at 1000
// characters, and its prompt field expects plain descriptive text, not JSON, so
// unlike Claude's instructions this stays deliberately terse.
function buildCompactBrandDescription(){
  const ctx = buildBrandContextJSON();
  const bits = [];
  if(ctx.business_type) bits.push(ctx.business_type.toLowerCase());
  if(ctx.brand_personality) bits.push(ctx.brand_personality.join(', ').toLowerCase());
  if(ctx.visual_theme) bits.push(ctx.visual_theme.name.toLowerCase()+' theme');
  if(ctx.color_palette) bits.push(ctx.color_palette.name.toLowerCase()+' colours');
  return bits.join(', ');
}

function buildLogoPrompts(){
  const companyName = S.business.company_name || 'the business';
  const context = buildCompactBrandDescription();
  const base = 'Flat vector illustration, plain white background, no shadows, no gradients, centred, no watermark, no mockup, logo only. The mark must fill most of the frame \u2014 minimal empty margin around it, not a small icon floating in a lot of white space. No invented text beyond the company name \u2014 no taglines, no slogans.';
  const iconText = `Professional combination logo mark for "${companyName}"${context?` (${context})`:''}. A simple, memorable icon representing the business, paired with the company name as text \u2014 icon above, beside, or integrated with the text, whichever reads best. Bold simple shapes, strong silhouette, at most 2-3 colours. ${base}`;
  const wordmark = `Professional text-only wordmark logo for "${companyName}"${context?` (${context})`:''}. Just the company name in stylised professional logo typography \u2014 no icon, no symbol, letters only. ${base}`;
  return [iconText, wordmark];
}

// Four genuinely distinct prompts — not one prompt describing 4 shots, since
// that reliably produces 4 near-identical results (see triggerImagesGeneration).
// Two of the four are explicitly product shots, per the client's request.
function buildImagesPrompts(){
  const companyName = S.business.company_name || 'the business';
  const context = buildCompactBrandDescription();
  const style = 'Natural lighting, high resolution, professional commercial photography, realistic, not illustrated or cartoon.';
  const noText = 'No invented text anywhere \u2014 no words, labels, captions, price tags, or slogans. The only text allowed is the business name, only if it appears naturally as real signage on the building itself. No watermark, no mockup.';
  const shots = [
    { desc: 'Close-up of a signature product or service, styled like professional product photography.' },
    { desc: 'Close-up of a different product or service than the first shot, showing variety.' },
    { desc: 'The storefront or workspace exterior, as seen from the street.' },
    { desc: 'The interior or working environment, showing the atmosphere.' },
  ];
  return shots.map(s => `${s.desc} For "${companyName}"${context?` (${context})`:''}. ${style} ${noText}`);
}

// ── Logo generation UI ──────────────────────────────────────────────────

const LOGO_MAX = 4;
const IMAGES_MAX = 8;

function renderLogoPreview(){
  const generating = logoGenState === 'generating';
  const existing = generatedLogoUrls.length;
  const atMax = existing >= LOGO_MAX;
  const selectedUrl = S.assets.selected_logo_url;
  const boxesToShow = generating ? existing + 2 : existing;
  const showGrid = generating || existing>0;
  const box = (i)=>{
    const url = generatedLogoUrls[i];
    if(url){
      const sel = url===selectedUrl;
      return `<div class="preview-select-wrap ${sel?'sel':''}" onclick="selectGeneratedLogo('${ev(url)}')" title="${sel?'Selected':'Click to select this logo'}">
        <img class="logo-preview-img" src="${ev(url)}" alt="Generated logo option ${i+1}">
        ${sel?'<div class="preview-select-badge">\u2713 Selected</div>':''}
      </div>`;
    }
    if(generating) return `<div class="logo-preview-placeholder">Generating\u2026</div>`;
    return '';
  };
  const grid = showGrid ? `<div class="logo-preview-grid">${Array.from({length:boxesToShow}).map((_,i)=>`<div class="logo-preview-box">${box(i)}</div>`).join('')}</div>` : '';
  let actionArea;
  if(generating){
    actionArea = `<button class="btn" type="button" disabled>Generating\u2026</button>`;
  } else if(existing===0){
    actionArea = `<button class="btn btn-save" type="button" onclick="triggerLogoGeneration()">Generate logo</button>`;
  } else if(atMax){
    actionArea = `<div class="preview-select-hint">You\u2019ve reached the maximum of ${LOGO_MAX} logo options.</div>`;
  } else {
    actionArea = `<button class="btn" type="button" onclick="triggerLogoGeneration()">Not keen on these? Generate 2 more options</button>`;
  }
  const hint = existing>0 && !generating ? `<div class="preview-select-hint">Click a logo to select it \u2014 the selected one is what gets sent to the website build.</div>` : '';
  return `${grid}${hint}${actionArea}`;
}

function selectGeneratedLogo(url){
  S.assets.selected_logo_url = (S.assets.selected_logo_url === url) ? '' : url;
  renderStep(currentStep);
}

// Calls the real Recraft-backed endpoint when the connected engine (preview.html)
// is available. In the standalone form (index.html, no backend) or when Recraft
// isn't configured yet, this explains what's missing instead of pretending to work.
// Previously generated logos are kept (not replaced) — a regenerate adds 2 more
// options alongside the existing ones, up to LOGO_MAX total, then stops.
async function triggerLogoGeneration(){
  if(typeof api !== 'function' || typeof detectApi !== 'function'){
    toast('Logo generation needs the connected engine (open this from the full app)');
    return;
  }
  if(generatedLogoUrls.length >= LOGO_MAX){
    toast('You\u2019ve reached the maximum of '+LOGO_MAX+' logo options');
    return;
  }
  const isRegenerate = generatedLogoUrls.length > 0;
  logoGenState = 'generating';
  renderStep(currentStep);
  try{
    if(!(await detectApi())){
      toast('Can\u2019t reach the engine — is it running?');
      return;
    }
    const prompts = buildLogoPrompts();
    const res = await api('/logo/generate', {method:'POST', body: JSON.stringify({prompts})});
    if(res.simulated){
      toast('Recraft isn\u2019t connected yet \u2014 add your API key under Integrations \u2192 Logo & Image Generation');
    } else if(res.logos && res.logos.length){
      generatedLogoUrls = generatedLogoUrls.concat(res.logos.slice(0,2));
      toast(isRegenerate ? 'Two more logo options added' : 'Logo options ready');
    } else {
      toast('Recraft didn\u2019t return any logos \u2014 try again');
    }
  }catch(err){
    toast(err.message || 'Logo generation failed');
  }finally{
    logoGenState = 'idle';
    renderStep(currentStep);
  }
}

// ── Image generation UI ──────────────────────────────────────────────────

function renderImagesPreview(){
  const generating = imagesGenState === 'generating';
  const existing = generatedImageUrls.length;
  const atMax = existing >= IMAGES_MAX;
  const selectedUrls = S.assets.selected_image_urls;
  const boxesToShow = generating ? existing + 4 : existing;
  const showGrid = generating || existing>0;
  const box = (i)=>{
    const url = generatedImageUrls[i];
    if(url){
      const sel = selectedUrls.includes(url);
      return `<div class="preview-select-wrap ${sel?'sel':''}" onclick="toggleSelectedImage('${ev(url)}')" title="${sel?'Selected':'Click to select this image'}">
        <img class="logo-preview-img" src="${ev(url)}" alt="Generated image ${i+1}">
        ${sel?'<div class="preview-select-badge">\u2713 Selected</div>':''}
      </div>`;
    }
    if(generating) return `<div class="logo-preview-placeholder">Generating\u2026</div>`;
    return '';
  };
  const grid = showGrid ? `<div class="images-preview-grid">${Array.from({length:boxesToShow}).map((_,i)=>`<div class="logo-preview-box">${box(i)}</div>`).join('')}</div>` : '';
  let actionArea;
  if(generating){
    actionArea = `<button class="btn" type="button" disabled>Generating\u2026</button>`;
  } else if(existing===0){
    actionArea = `<button class="btn btn-save" type="button" onclick="triggerImagesGeneration()">Generate images</button>`;
  } else if(atMax){
    actionArea = `<div class="preview-select-hint">You\u2019ve reached the maximum of ${IMAGES_MAX} images.</div>`;
  } else {
    actionArea = `<button class="btn" type="button" onclick="triggerImagesGeneration()">Not keen on these? Generate 4 more options</button>`;
  }
  const hint = existing>0 && !generating ? `<div class="preview-select-hint">Click any images to select them \u2014 selected images are what get sent to the website build.</div>` : '';
  return `${grid}${hint}${actionArea}`;
}

function toggleSelectedImage(url){
  const arr = S.assets.selected_image_urls;
  const i = arr.indexOf(url);
  if(i>=0) arr.splice(i,1); else arr.push(url);
  renderStep(currentStep);
}

// Previously generated images are kept (not replaced) — a regenerate adds 4 more
// options alongside the existing ones, up to IMAGES_MAX total, then stops.
async function triggerImagesGeneration(){
  if(typeof api !== 'function' || typeof detectApi !== 'function'){
    toast('Image generation needs the connected engine (open this from the full app)');
    return;
  }
  if(generatedImageUrls.length >= IMAGES_MAX){
    toast('You\u2019ve reached the maximum of '+IMAGES_MAX+' images');
    return;
  }
  const isRegenerate = generatedImageUrls.length > 0;
  imagesGenState = 'generating';
  renderStep(currentStep);
  try{
    if(!(await detectApi())){
      toast('Can\u2019t reach the engine — is it running?');
      return;
    }
    const prompts = buildImagesPrompts();
    const res = await api('/images/generate', {method:'POST', body: JSON.stringify({prompts})});
    if(res.simulated){
      toast('Recraft isn\u2019t connected yet \u2014 add your API key under Integrations \u2192 Logo & Image Generation');
    } else if(res.images && res.images.length){
      generatedImageUrls = generatedImageUrls.concat(res.images.slice(0,4));
      toast(isRegenerate ? 'Four more image options added' : 'Images ready');
    } else {
      toast('Recraft didn\u2019t return any images \u2014 try again');
    }
  }catch(err){
    toast(err.message || 'Image generation failed');
  }finally{
    imagesGenState = 'idle';
    renderStep(currentStep);
  }
}

function renderFile(stepKey, f, v){
  const id = `f_${stepKey}_${f.key}`;
  return `<div class="file-row">
    <input type="file" id="${id}" onchange="handleFile('${stepKey}','${f.key}',this)">
    <button class="btn" type="button" onclick="document.getElementById('${id}').click()">Upload</button>
    <span class="file-name ${v?'':'empty'}" id="filename_${id}">${ev(v||'No file selected')}</span>
  </div>`;
}

// ── Update handlers ──────────────────────────────────────────────────────

// Text-like inputs: update state only, no full step re-render (avoids losing cursor focus)
function updField(stepKey, key, val){
  S[stepKey][key] = val;
  refreshOutputOnly();
}

// Discrete select/click inputs: update state and re-render the step (handles conditional fields)
function selectField(stepKey, key, val){
  S[stepKey][key] = val;
  // Category changed — reset subcategory and business_type since their options depend on it
  if(stepKey==='business' && key==='category'){ S.business.subcategory = ''; S.business.business_type = ''; }
  // Subcategory changed — reset business_type since its options depend on it, then apply playbook defaults
  if(stepKey==='business' && key==='subcategory'){
    S.business.business_type = '';
    applyPlaybookDefaults();
  }
  // Logo status changed away from "Please make me a logo" — clear any previously generated logos
  if(stepKey==='assets' && key==='logo_status' && val!=='need_one'){
    generatedLogoUrls = [];
  }
  // Device changed to mobile — default layout to a mobile-friendly base style.
  // Still fully editable afterward; this just sets a sensible starting point.
  if(stepKey==='look_feel' && key==='dominant_screen'){
    const isMobile = val==='mobile_basic' || val==='mobile_big';
    if(isMobile && (!S.look_feel.layout || MOBILE_UNSUITABLE_LAYOUTS.includes(S.look_feel.layout))){
      S.look_feel.layout = 'single_column_longform';
      toast('Layout set to Single-column Longform \u2014 a good base for mobile, feel free to change it');
    }
  }
  renderStep(currentStep);
}

// Pre-fills Look & Feel and Call to Action fields that are still empty, based on the
// subcategory-level playbook. Never overwrites a field the user has already set.
function applyPlaybookDefaults(){
  const entry = PLAYBOOK[S.business.category]?.[S.business.subcategory];
  if(!entry) return;
  const lf = S.look_feel, cta = S.cta;
  if(lf.personality.length===0) lf.personality = [...entry.personality];
  if(!lf.theme) lf.theme = entry.theme;
  if(!lf.visual_density) lf.visual_density = entry.visual_density;
  if(!lf.color_palette) lf.color_palette = entry.color_palette;
  if(cta.main_goal.length===0) cta.main_goal = [...entry.main_goal];
  if(cta.primary_button_text.length===0) cta.primary_button_text = [...entry.primary_button_text];
}

function filterBusinessTypeSearch(query){
  const box = el('business_type_search_results');
  if(!box) return;
  const q = query.trim().toLowerCase();
  if(q.length<2){ box.innerHTML=''; box.classList.remove('open'); return; }
  const matches = BUSINESS_TYPE_INDEX.filter(item=>item.typeLabel.toLowerCase().includes(q)).slice(0,8);
  box.classList.add('open');
  if(!matches.length){ box.innerHTML='<div class="cascade-search-empty">No matches</div>'; return; }
  box.innerHTML = matches.map(m=>`<div class="cascade-search-item" onclick="selectBusinessTypeFromSearch('${m.category}','${m.subcategory}','${m.type}')">
    <span class="cascade-search-name">${ev(m.typeLabel)}</span>
    <span class="cascade-search-path">${ev(m.categoryLabel)} \u2192 ${ev(m.subcategoryLabel)}</span>
  </div>`).join('');
}

function selectBusinessTypeFromSearch(category, subcategory, type){
  S.business.category = category;
  S.business.subcategory = subcategory;
  S.business.business_type = type;
  applyPlaybookDefaults();
  renderStep(currentStep);
  const label = CATEGORIES[category]?.subcategories[subcategory]?.types.find(t=>t.v===type)?.l || type;
  toast('Selected: '+label);
}

function toggleMulti(stepKey, key, val){
  const arr = S[stepKey][key];
  const field = fieldForKey(stepKey, key);
  const exclusiveOpts = (field && field.exclusiveOpts) || [];
  const i = arr.indexOf(val);
  if(i>=0){
    arr.splice(i,1);
  } else if(exclusiveOpts.includes(val)){
    arr.length = 0;
    arr.push(val);
  } else {
    exclusiveOpts.forEach(ex=>{
      const exIdx = arr.indexOf(ex);
      if(exIdx>=0) arr.splice(exIdx,1);
    });
    arr.push(val);
  }
  // Images status changed away from "Please make me all" — clear any previously generated images
  if(stepKey==='assets' && key==='images_status' && !arr.includes('make_all')){
    generatedImageUrls = [];
  }
  renderStep(currentStep);
}

function toggleCardsMulti(stepKey, key, val, max){
  const arr = S[stepKey][key];
  const i = arr.indexOf(val);
  if(i>=0){
    arr.splice(i,1);
  } else if(arr.length < max){
    arr.push(val);
  } else {
    toast(`You can select up to ${max}`);
    return;
  }
  renderStep(currentStep);
}

function updHours(stepKey, key, day, part, val){
  S[stepKey][key][day][part] = val;
  renderStep(currentStep);
}

function updHoursClosed(stepKey, key, day, checked){
  S[stepKey][key][day].closed = checked;
  renderStep(currentStep);
}

function addProduct(stepKey, key){
  const arr = S[stepKey][key];
  if(arr.length>=3) return;
  arr.push({name:'', description:'', photo:''});
  renderStep(currentStep);
}

function removeProduct(stepKey, key, idx){
  S[stepKey][key].splice(idx,1);
  renderStep(currentStep);
}

function updProduct(stepKey, key, idx, field, val){
  S[stepKey][key][idx][field] = val;
  refreshOutputOnly();
}

function updProductPhoto(stepKey, key, idx, inputEl){
  const name = inputEl.files[0]?.name || '';
  S[stepKey][key][idx].photo = name;
  renderStep(currentStep);
}

function addTestimonial(stepKey, key, max){
  const arr = S[stepKey][key];
  if(arr.length>=max) return;
  arr.push({name:'', quote:''});
  renderStep(currentStep);
}

function removeTestimonial(stepKey, key, idx){
  S[stepKey][key].splice(idx,1);
  renderStep(currentStep);
}

function updTestimonial(stepKey, key, idx, field, val){
  S[stepKey][key][idx][field] = val;
  refreshOutputOnly();
}

// Real file content for each upload field, keyed by "stepKey.key" -> {name, mimeType, base64}.
// S[stepKey][key] still just holds the filename for display/JSON purposes — the actual
// bytes live here and get sent separately when a build job is created.
let uploadedFileData = {};
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8MB per file

// What each upload is actually FOR, so the site build knows to genuinely display it
// (not just mention its existence) and roughly where it belongs on the site.
const UPLOAD_ASSET_DESCRIPTIONS = {
  logo_upload: 'The business\u2019s real logo \u2014 use this exact file as the logo everywhere a logo appears; do not generate a placeholder logo.',
  photo_owner: 'A real photo of the business owner \u2014 display it, e.g. in an About section.',
  photo_front_shop: 'A real photo of the business\u2019s shopfront/workspace \u2014 display it, e.g. in the homepage hero, About, or Gallery section.',
  photo_team: 'A real photo of the team \u2014 display it, e.g. in an About or Team section.',
  before_after_before_upload: 'A real "before" photo for a before/after comparison \u2014 display it alongside the matching after photo, clearly labelled.',
  before_after_after_upload: 'A real "after" photo for a before/after comparison \u2014 display it alongside the matching before photo, clearly labelled.',
  customer_reviews_upload: 'Real customer review screenshot(s) \u2014 display them, e.g. in a Reviews/Testimonials section, not just described in text.',
  awards_certifications_upload: 'A real award badge or certificate image \u2014 display the actual image itself, e.g. in an About or Trust/Credentials section \u2014 do not just reference it in text without showing it.',
  client_logos_upload: 'Real client/partner logo(s) \u2014 display them, e.g. in a "Trusted by" or Clients section.',
};

function handleFile(stepKey, key, inputEl){
  const file = inputEl.files[0];
  const name = file?.name || '';
  S[stepKey][key] = name;
  const span = el(`filename_f_${stepKey}_${key}`);
  if(span){ span.textContent = name || 'No file selected'; span.classList.toggle('empty', !name); }
  refreshOutputOnly();
  if(!file){ delete uploadedFileData[`${stepKey}.${key}`]; return; }
  if(file.size > MAX_UPLOAD_BYTES){
    toast('That file is too large (max 8MB) \u2014 the filename is saved, but not the file itself');
    delete uploadedFileData[`${stepKey}.${key}`];
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    uploadedFileData[`${stepKey}.${key}`] = { name, mimeType: file.type || 'application/octet-stream', base64: reader.result.split(',')[1] || '' };
  };
  reader.onerror = () => { toast('Couldn\u2019t read that file \u2014 try again'); };
  reader.readAsDataURL(file);
}

// Builds the payload of real uploaded file bytes to send alongside a build job.
// Only includes image-type uploads meant to actually appear on the site.
function collectUploadsPayload(){
  const uploads = {};
  Object.entries(uploadedFileData).forEach(([key, data])=>{
    if(!data || !data.base64) return;
    const fieldKey = key.split('.')[1];
    uploads[fieldKey] = { ...data, description: UPLOAD_ASSET_DESCRIPTIONS[fieldKey] || null };
  });
  return uploads;
}

// ── Step rendering ───────────────────────────────────────────────────────

const STEP_COLORS = {
  business: '#3B82F6', assets: '#8B5CF6', pages: '#10B981', look_feel: '#F59E0B',
  audience: '#EC4899', cta: '#EF4444', trust: '#14B8A6', final: '#6366F1',
};

function renderStepNav(){
  const nav = el('nav');
  if(!nav) return;
  nav.innerHTML = STEPS.map((step, i)=>{
    const done = stepFilledCount(step) > 0;
    const count = visibleFields(step).length;
    return `<div class="nav-item ${i===currentStep?'active':''}" onclick="goToStep(${i})">
      <div class="nav-icon" style="background:${STEP_COLORS[step.key]}"></div>
      <div class="nav-dot ${done?'on':''}"></div>
      <div class="nav-name">${step.num}. ${ev(step.title)}</div>
      <div class="nav-count">${count}</div>
    </div>`;
  }).join('');
}

function renderStep(idx, opts){
  currentStep = idx;
  const step = STEPS[idx];
  const main = el('mform');
  if(!main || !step) return;
  const fields = visibleFields(step).filter(f=>!f.hidden);
  main.innerHTML = `
    <div class="sec-hdr">
      <div class="sec-icon" style="background:${STEP_COLORS[step.key]}"></div>
      <div>
        <div class="sec-title">${step.num}. ${ev(step.title)}</div>
        <div class="sec-desc">${ev(step.desc)}</div>
        <div class="sec-key">${ev(step.key)}</div>
      </div>
    </div>
    <div class="fgrid">${fields.map(f=>renderField(step.key, f)).join('')}</div>
    <div class="nav-arrows">
      <button class="nav-arr" id="bprev" onclick="nav(-1)">Back</button>
      <button class="nav-arr" id="bnext" onclick="nav(1)">Next</button>
    </div>
  `;
  renderStepNav();
  refreshOutputOnly();
  const bprev = el('bprev'), bnext = el('bnext');
  if(bprev) bprev.disabled = idx===0;
  if(bnext) bnext.textContent = idx===STEPS.length-1 ? 'Generate website' : 'Next';
  // Only reset scroll on an actual step change (Back/Next/sidebar nav) — never on an
  // in-place re-render triggered by toggling a checkbox, copying hours, etc, or the
  // user's scroll position within the step gets yanked back to the top constantly.
  if(opts && opts.scrollTop){
    main.scrollTop = 0;
    if(typeof window!=='undefined' && window.scrollTo) window.scrollTo(0,0);
  }
}

function goToStep(idx){
  if(idx<0 || idx>=STEPS.length) return;
  renderStep(idx, {scrollTop:true});
}

function nav(dir){
  const next = currentStep + dir;
  if(next<0) return;
  if(next>=STEPS.length){
    if(typeof openBuildModal === 'function') openBuildModal(); else generatePrompt();
    return;
  }
  goToStep(next);
}

// ── Completion / validation ──────────────────────────────────────────────

function isFieldFilled(stepKey, f){
  const v = S[stepKey][f.key];
  if(f.type==='chips' || f.type==='products' || f.type==='testimonials' || f.type==='cards_multi' || f.type==='buttons_multi' || f.type==='hidden_multi') return Array.isArray(v) && v.length>0;
  if(f.type==='hours') return Object.values(v).some(d=>d.closed || d.open || d.close);
  return v!=null && String(v).trim()!=='';
}

function stepFilledCount(step){
  return flattenStepFields(step).filter(f=>isFieldFilled(step.key, f)).length;
}

function requiredFieldsFlat(){
  const out = [];
  STEPS.forEach(step=>flattenStepFields(step).forEach(f=>{
    if(f.required && (!f.showIf || f.showIf(S))) out.push({stepKey:step.key, stepNum:step.num, field:f});
  }));
  return out;
}

function computeProgress(){
  const req = requiredFieldsFlat();
  const filled = req.filter(r=>isFieldFilled(r.stepKey, r.field)).length;
  return {filled, total: req.length, pct: req.length? Math.round(filled/req.length*100) : 0};
}

function validationMessages(){
  return requiredFieldsFlat()
    .filter(r=>!isFieldFilled(r.stepKey, r.field))
    .map(r=>({kind:'warn', stepIdx: STEPS.findIndex(s=>s.key===r.stepKey), text:`Step ${r.stepNum}: add ${r.field.label}.`}));
}

// ── JSON building & output panel ─────────────────────────────────────────

function buildJSON(){
  const out = {};
  STEPS.forEach(step=>{
    const stepOut = {};
    flattenStepFields(step).forEach(f=>{
      if(f.showIf && !f.showIf(S)) return;
      if(!isFieldFilled(step.key, f)) return;
      stepOut[f.key] = S[step.key][f.key];
    });
    if(Object.keys(stepOut).length) out[step.key] = stepOut;
  });
  return out;
}

function syntaxHighlight(json){
  const str = JSON.stringify(json, null, 2);
  return ev(str).replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false)\b|\bnull\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    m=>{
      let cls='jn';
      if(/^"/.test(m)) cls = /:$/.test(m) ? 'jk' : 'js';
      else if(/true|false/.test(m)) cls='jbool';
      else if(/null/.test(m)) cls='jnull';
      return `<span class="${cls}">${m}</span>`;
    });
}

function refreshOutputOnly(){
  const data = buildJSON();
  const jout = el('jout');
  if(jout) jout.innerHTML = syntaxHighlight(data);

  const progress = computeProgress();
  const sf = el('sf'), sg = el('sg'), ss = el('ss');
  if(sf) sf.textContent = progress.filled;
  if(sg) sg.textContent = progress.total;
  if(ss) ss.textContent = JSON.stringify(data).length;
  const hfilled = el('hfilled'), htotal = el('htotal');
  if(hfilled) hfilled.textContent = progress.filled;
  if(htotal) htotal.textContent = progress.total;
  const hgroups = el('hgroups'), hgroupTotal = el('hgroupTotal');
  if(hgroups) hgroups.textContent = STEPS.filter(s=>stepFilledCount(s)>0).length;
  if(hgroupTotal) hgroupTotal.textContent = STEPS.length;

  const pfill = el('pfill'), ppct = el('ppct');
  if(pfill) pfill.style.width = progress.pct+'%';
  if(ppct) ppct.textContent = progress.pct+'%';

  const vpanel = el('validationPanel');
  if(vpanel){
    const msgs = validationMessages();
    vpanel.innerHTML = msgs.length
      ? msgs.slice(0,8).map(m=>`<div class="vitem warn" data-target onclick="goToStep(${m.stepIdx})">${ev(m.text)}</div>`).join('')
      : `<div class="vitem ok">All required fields are filled.</div>`;
  }
}

// ── Prompt generation ─────────────────────────────────────────────────────

function generatePrompt(){
  const mode = el('promptMode') ? el('promptMode').value : 'copywriting';
  const data = buildJSON();
  let text = '';
  const business = data.business || {};
  const companyName = business.company_name || 'the client';

  if(mode==='developer'){
    text = `You are the Big Black Point website build engine.\nGenerate a complete static website (HTML5, CSS, vanilla JS — no framework) for ${companyName}.\nUse plain HTML/CSS/JS only. Cover every page listed in pages.selected_pages.\n\n${JSON.stringify(data, null, 2)}`;
  } else if(mode==='api_payload'){
    text = JSON.stringify(data, null, 2);
  } else if(mode==='creative_brief'){
    text = `WEBSITE BRIEF — ${companyName}\n\n${JSON.stringify(data, null, 2)}\n\nUse this brief to shape tone, layout, and visual direction as described in look_feel.`;
  } else if(mode==='production_checklist'){
    const pages = (data.pages && data.pages.selected_pages) || [];
    text = `PRODUCTION CHECKLIST — ${companyName}\n\nPages to build:\n${pages.map(p=>`- ${p}`).join('\n')}\n\nFull brief:\n${JSON.stringify(data, null, 2)}`;
  } else {
    text = `Generate a static website brief for ${companyName} using the structured JSON below. Write in a tone consistent with the selected personality and theme.\n\n${JSON.stringify(data, null, 2)}`;
  }

  const pv = el('promptPreviewText');
  if(pv) pv.textContent = text;
  generatePrompt._last = text;
  toast('Prompt generated');
  return text;
}

function copyPrompt(){
  const text = generatePrompt._last || generatePrompt();
  navigator.clipboard.writeText(text).then(()=>toast('Prompt copied'));
}

function copyJSON(){
  navigator.clipboard.writeText(JSON.stringify(buildJSON(), null, 2)).then(()=>toast('JSON copied'));
}

function downloadPrompt(){
  const text = generatePrompt._last || generatePrompt();
  const blob = new Blob([text], {type:'text/plain'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'bbp-prompt.txt'; a.click();
  URL.revokeObjectURL(a.href);
}

function dlJSON(){
  const blob = new Blob([JSON.stringify(buildJSON(), null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'bbp-brief.json'; a.click();
  URL.revokeObjectURL(a.href);
}

function exportProject(){
  const blob = new Blob([JSON.stringify({state:S}, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'bbp-project.json'; a.click();
  URL.revokeObjectURL(a.href);
}

function importJSON(evt){
  const file = evt.target.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const parsed = JSON.parse(reader.result);
      S = parsed.state ? parsed.state : mergeIntoState(parsed);
      renderStep(0);
      toast('Imported');
    }catch(e){ toast('Invalid JSON file'); }
  };
  reader.readAsText(file);
  evt.target.value = '';
}

function mergeIntoState(data){
  const s = emptyState();
  Object.entries(data).forEach(([stepKey, fields])=>{
    if(s[stepKey]) Object.assign(s[stepKey], fields);
  });
  return s;
}

function resetAll(){
  S = emptyState();
  renderStep(0);
  toast('All fields reset');
}

// ── Presets (localStorage) ────────────────────────────────────────────────

const PRESET_KEY = 'bbp_wizard_presets';

function getPresets(){
  try{ return JSON.parse(localStorage.getItem(PRESET_KEY)) || []; }catch{ return []; }
}
function setPresets(list){ localStorage.setItem(PRESET_KEY, JSON.stringify(list)); }

function renderPresets(){
  const list = getPresets();
  const plist = el('plist'), ppcount = el('pp-count');
  if(ppcount) ppcount.textContent = list.length;
  if(!plist) return;
  plist.innerHTML = list.length ? list.map((p,i)=>`
    <div class="preset-item">
      <div class="preset-name">${ev(p.name)}</div>
      <div class="preset-date">${new Date(p.savedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</div>
      <div class="p-load" onclick="loadPreset(${i})">Load</div>
      <div class="p-del" onclick="deletePreset(${i})">×</div>
    </div>`).join('') : `<div class="no-presets">No presets saved yet</div>`;
}

function openModal(){
  const info = el('minfo');
  if(info){
    const progress = computeProgress();
    info.innerHTML = `Fields filled: <b>${progress.filled}</b> / ${progress.total} required`;
  }
  el('mbg').classList.add('open');
  el('pname').focus();
}
function closeModal(){ el('mbg').classList.remove('open'); }
function bgClick(e){ if(e.target.id==='mbg') closeModal(); }

function savePreset(){
  const name = el('pname').value.trim();
  if(!name){ toast('Enter a preset name'); return; }
  const list = getPresets();
  list.unshift({name, savedAt: new Date().toISOString(), state: S});
  setPresets(list.slice(0,30));
  el('pname').value = '';
  closeModal();
  renderPresets();
  toast('Preset saved');
}

function loadPreset(i){
  const list = getPresets();
  const p = list[i]; if(!p) return;
  S = p.state;
  renderStep(0);
  toast(`Loaded "${p.name}"`);
}

function deletePreset(i){
  const list = getPresets();
  list.splice(i,1);
  setPresets(list);
  renderPresets();
}

// ── Misc UI ──────────────────────────────────────────────────────────────

function toggleActionMenu(evt){
  evt.stopPropagation();
  el('actionMenu').classList.toggle('open');
}
function closeActionMenu(){ el('actionMenu').classList.remove('open'); }
document.addEventListener('click', ()=>closeActionMenu());

function toggleTheme(){
  document.body.classList.toggle('dark');
  localStorage.setItem('bbp_theme', document.body.classList.contains('dark') ? 'dark' : 'light');
  const btn = el('themeBtn');
  if(btn) btn.textContent = document.body.classList.contains('dark') ? 'Light mode' : 'Dark mode';
}
function applyTheme(){
  const saved = localStorage.getItem('bbp_theme');
  if(saved==='dark') document.body.classList.add('dark');
  const btn = el('themeBtn');
  if(btn) btn.textContent = document.body.classList.contains('dark') ? 'Light mode' : 'Dark mode';
}

// ── Init ─────────────────────────────────────────────────────────────────

applyTheme();
renderStep(0);
renderPresets();
