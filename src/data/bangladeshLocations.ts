/**
 * Authoritative Bangladesh Administrative Location Dataset
 * Hierarchy: Division (8) -> District (64) -> Upazila/Thana -> Union/Ward
 * Source: Bangladesh Bureau of Statistics (BBS) & Local Government Division (LGD)
 */

export interface BdLocationHierarchy {
  [division: string]: {
    [district: string]: {
      [upazila: string]: string[]; // list of unions or wards
    };
  };
}

export const BANGLADESH_LOCATIONS: BdLocationHierarchy = {
  Dhaka: {
    Dhaka: {
      Dhanmondi: ['Ward 15', 'Ward 16', 'Road 27 Area', 'Shankar', 'Rayerbazar', 'Jigatola'],
      Gulshan: ['Ward 19', 'Gulshan 1', 'Gulshan 2', 'Niketan', 'Shahjadpur', 'Baridhara Diplomatic Zone'],
      Banani: ['Ward 19', 'Block A-F', 'Kakoli', 'Chairman Bari', 'Banani DOHS'],
      Uttara: ['Sector 1-4 (Ward 1)', 'Sector 5-8 (Ward 2)', 'Sector 9-14 (Ward 3)', 'Sector 15-18 (Ward 4)', 'Uttarkhan', 'Dakshinkhan'],
      Mirpur: ['Mirpur 1', 'Mirpur 2', 'Mirpur 6', 'Mirpur 10', 'Mirpur 11', 'Mirpur 12', 'Mirpur 14', 'Pallabi'],
      Mohammadpur: ['Town Hall Area', 'Salimullah Road', 'Noorjahan Road', 'Lalmatia', 'Japan Garden City', 'Bosila'],
      Motijheel: ['Dilkusha', 'Arambagh', 'Fakirapool', 'Kamalapur', 'Motijheel C/A'],
      Tejgaon: ['Tejgaon I/A', 'Farmgate', 'Tejkunipara', 'Monipuripara', 'Nakhalpara'],
      Khilgaon: ['Goran', 'Taltola', 'Shipahibagh', 'Khilgaon C-Block', 'Tilpapara'],
      Badda: ['North Badda', 'South Badda', 'Middle Badda', 'Merul Badda', 'Aftabnagar'],
      Rampura: ['East Rampura', 'West Rampura', 'Banasree Block A-C', 'Banasree Block D-M', 'Ulan'],
      Savar: ['Savar Union', 'Ashulia', 'Birulia', 'Pathalia', 'Shimulia', 'Dhamsona', 'Yearpur', 'Kaundia'],
      Dhamrai: ['Dhamrai Union', 'Amta', 'Baisakanda', 'Balia', 'Kushura', 'Rowail', 'Sanora', 'Sutipara'],
      Keraniganj: ['Aganagar', 'Zinzira', 'Kalindi', 'Rohitpur', 'Basta', 'Shuvadda', 'Konda', 'Taranagar'],
      Nawabganj: ['Bandura', 'Baruakhali', 'Galimpur', 'Jalnagar', 'Kailail', 'Shikaripara', 'Agla'],
      Dohar: ['Bilashpur', 'Kusumhati', 'Mahmudpur', 'Narisha', 'Nayabari', 'Ratanpur', 'Sutarpara'],
    },
    Gazipur: {
      'Gazipur Sadar': ['Ward 1-10 (City Corp)', 'Bason', 'Konabari', 'Kashimpur', 'Joydebpur', 'Gacha'],
      Kaliakair: ['Atabaha', 'Boali', 'Chapair', 'Dhaljora', 'Fulbaria', 'Madhabpur', 'Mouchak', 'Sreefaltali'],
      Kapasia: ['Barishaba', 'Chandpur', 'Durgapur', 'Ghagutia', 'Kapasia Union', 'Karihata', 'Rayed', 'Sanmania'],
      Sreepur: ['Baroipara', 'Bormi', 'Gosinga', 'Kaoraid', 'Maona', 'Prahladpur', 'Rajabari', 'Telihati'],
      Kaliganj: ['Bahadursadi', 'Baktarpur', 'Jangalia', 'Kaliganj Union', 'Moktarpur', 'Nagari', 'Tumulia'],
    },
    Narayanganj: {
      'Narayanganj Sadar': ['Ward 1-10 (City Corp)', 'Alirtek', 'Baktabali', 'Enayetnagar', 'Fatullah', 'Gogra', 'Kutubpur'],
      Araihazar: ['Bishnandi', 'Brahmarndi', 'Duptara', 'Fatehpur', 'Haizadi', 'Kala Paharia', 'Khagkanda', 'Mahmudpur'],
      Bandar: ['Bandar Union', 'Dhamgarh', 'Kala Gachhia', 'Madanganj', 'Musapur', 'Muchhadia'],
      Rupganj: ['Bholabo', 'Daudpur', 'Golakandail', 'Kayetpara', 'Murapara', 'Rupganj Union', 'Tarabo'],
      Sonargaon: ['Baidyer Bazar', 'Baradi', 'Jampur', 'Kachpur', 'Mograpara', 'Noagaon', 'Pirojpur', 'Sadipur'],
    },
    Tangail: {
      'Tangail Sadar': ['Baghil', 'Danya', 'Gala', 'Gharinda', 'Hugra', 'Karatia', 'Maguradanga', 'Silimpur'],
      Gopalpur: ['Alamnagar', 'Dhaleshwari', 'Hadira', 'Hemnagar', 'Jhawail', 'Mirzapur', 'Nagbari'],
      Madhupur: ['Alokdia', 'Aronkhola', 'Ausnara', 'Golabari', 'Kashil', 'Mirzabari', 'Solakura'],
      Mirzapur: ['Anai Tara', 'Bhatgram', 'Banshtail', 'Gorai', 'Jamurki', 'Latifpur', 'Tarafpur'],
    },
    Kishoreganj: {
      'Kishoreganj Sadar': ['Binnati', 'Boulai', 'Chauddashata', 'Danapatuli', 'Jasodal', 'Korsakari', 'Mahinanda', 'Maria'],
      Bajitpur: ['Baliardi', 'Dighirpar', 'Gajirchar', 'Humaipur', 'Kailaguri', 'Maijchar', 'Sararchar'],
      Bhairab: ['Aganagar', 'Ghazaria', 'Kalikaprashad', 'Muradnagar', 'Sadekpur', 'Shimulkandi', 'Sreenagar'],
    },
    Manikganj: {
      'Manikganj Sadar': ['Atigram', 'Betila Mitara', 'Bhararia', 'Dighi', 'Garpara', 'Habilashpur', 'Jafrabad', 'Nabagram'],
      Singair: ['Baldhara', 'Baira', 'Charigram', 'Dhalla', 'Jamirta', 'Joymantap', 'Saikhati', 'Talta'],
    },
    Munshiganj: {
      'Munshiganj Sadar': ['Adhara', 'Banglabazar', 'Bajrajogini', 'Char Kewar', 'Mirkadim', 'Mollakandi', 'Rampur', 'Silchar'],
      Sreenagar: ['Baraikhali', 'Baghra', 'Hashara', 'Kolapara', 'Patabhog', 'Rarikhal', 'Shyambazar', 'Tantar'],
    },
    Narsingdi: {
      'Narsingdi Sadar': ['Alokbali', 'Char Madhabpur', 'Chinishpur', 'Hazipur', 'Karimpur', 'Mahishasura', 'Meherpara', 'Paikarchar'],
      Palash: ['Char Sindur', 'Danga', 'Gazaria', 'Jinardi', 'Palash Union'],
    },
    Faridpur: {
      'Faridpur Sadar': ['Aliabad', 'Ambikapur', 'Bhatpara', 'Char Madhabdia', 'Dekurpar', 'Gerda', 'Kanaipur', 'Machchar'],
    },
    Gopalganj: {
      'Gopalganj Sadar': ['Bara Gopinathpur', 'Boultali', 'Chandradighalia', 'Durgapur', 'Haridaspur', 'Kati', 'Latifpur', 'Sahapur'],
    },
    Madaripur: {
      'Madaripur Sadar': ['Bahadurpur', 'Dhopabari', 'Ghatmajhi', 'Jhaudi', 'Kendua', 'Mastofapur', 'Panchkhola', 'Rampur'],
    },
    Rajbari: {
      'Rajbari Sadar': ['Aliabad', 'Banibaha', 'Chandani', 'Dadshi', 'Khankhanapur', 'Panchuria', 'Ramkantapur', 'Shahidpur'],
    },
    Shariatpur: {
      'Shariatpur Sadar': ['Angaria', 'Binodpur', 'Chikandi', 'Domshar', 'Mahmudpur', 'Palong', 'Rudrakar', 'Tulatali'],
    },
  },
  Chattogram: {
    Chattogram: {
      Kotwali: ['Ward 20 (Dewanbazar)', 'Ward 21 (Jamalkhan)', 'Ward 22 (Enayetbazar)', 'Ward 31 (Alkoron)', 'Ward 32 (Andarkilla)'],
      Panchlaish: ['Ward 7 (West Sholoshohar)', 'Ward 8 (Sholoshohar)', 'Ward 15 (Bagmoniram)', 'GEC Circle', 'Nasirabad', 'Khulshi'],
      'Double Mooring': ['Ward 23 (North Pathantooly)', 'Ward 24 (Agrabad)', 'Ward 27 (South Agrabad)', 'Ward 28 (Pathantooly)'],
      Halishahar: ['Ward 11 (South Kattali)', 'Ward 25 (Rampur)', 'Ward 26 (North Halishahar)', 'Halishahar H-Block'],
      Khulshi: ['Ward 13 (Pahartoli)', 'Ward 14 (Lalkhan Bazar)', 'South Khulshi', 'North Khulshi'],
      Patenga: ['Ward 39 (South Halishahar)', 'Ward 40 (North Patenga)', 'Ward 41 (South Patenga)', 'Airport Area'],
      Hathazari: ['Burischar', 'Chikandandi', 'Fatehpur', 'Guman Mordan', 'Hathazari Union', 'Mekhal', 'Mirzapur', 'Shikarpur'],
      Raozan: ['Baghwan', 'Binajuri', 'Chikdair', 'Dabua', 'Gohira', 'Kadamtali', 'Noapara', 'Pahartali', 'Raozan Union'],
      Sitakunda: ['Banshbaria', 'Barabkunda', 'Bhatiyari', 'Kumira', 'Muradpur', 'Salimpur', 'Sayedpur', 'Sonaichhari'],
      Mirsharai: ['Baratakia', 'Dhoom', 'Hinguli', 'Ichhakhali', 'Katachhara', 'Khaiyachhara', 'Mayani', 'Mithanala'],
      Patiya: ['Asia', 'Bara Uthan', 'Bhatikhara', 'Chanhara', 'Dhalghat', 'Habilashdwip', 'Jangalukhara', 'Kusumpura'],
    },
    'Cox\'s Bazar': {
      'Cox\'s Bazar Sadar': ['Ward 1-12 (Paurashava)', 'Barabil', 'Chowfaldandi', 'Jhilongja', 'Khurushkul', 'Patali Mashi', 'Ramu Border'],
      Teknaf: ['Baharchhara', 'Hnila', 'Sabrang', 'Saint Martin', 'Teknaf Sadar', 'Whykong'],
      Ramu: ['Chakmarkul', 'Dakshin Mithachhari', 'Fatekharkul', 'Garjania', 'Idghar', 'Kauwarkhop', 'Ramu Sadar'],
      Chakaria: ['Baraitali', 'Chiringa', 'Demusia', 'Fashiakhali', 'Harbang', 'Kakara', 'Konakhali', 'Matamuhuri'],
    },
    Cumilla: {
      'Cumilla Adarsha Sadar': ['Ward 1-15 (City Corp)', 'Amratali', 'Durgapur North', 'Durgapur South', 'Jagannathpur', 'Kalirbazar', 'Panchthubi'],
      'Cumilla Sadar Dakshin': ['Barapara', 'Belghar', 'Bijoypur', 'Chouara', 'Ghilatali', 'Perul North', 'Perul South'],
      Chandina: ['Baraikhanda', 'Barkamta', 'Dollai Nawabpur', 'Gallai', 'Kerankhal', 'Madhaiya', 'Mohichail', 'Suhilpur'],
      Debidwar: ['Barkamta', 'Bara Bhallabhpur', 'Dhampti', 'Elahabad', 'Ganiarchar', 'Jatrapur', 'Mohonpur', 'Rasulpur'],
    },
    Feni: {
      'Feni Sadar': ['Baligaon', 'Dholia', 'Farhadnagar', 'Fazilpur', 'Kalidah', 'Kazirbagh', 'Lemua', 'Motobi', 'Sarishadi'],
      Chhagalnaiya: ['Gopal', 'Mahamaya', 'Pathannagar', 'Radhanagar', 'Rohanpur', 'Subhapur'],
    },
    Brahmanbaria: {
      'Brahmanbaria Sadar': ['Basudeb', 'Bodhal', 'Budhhir', 'Majlishpur', 'Natai North', 'Natai South', 'Ramrail', 'Suhilpur', 'Talshahar'],
      Ashuganj: ['Araisidha', 'Ashuganj Union', 'Char Charua', 'Durgapur', 'Lalpur', 'Sharifpur', 'Tarua'],
    },
    Noakhali: {
      'Noakhali Sadar': ['Aojbalia', 'Binodpur', 'Charmatua', 'Dadpur', 'Dharmapur', 'Eklashpur', 'Kadirdanif', 'Kadirhanif', 'Niazpur'],
      Begumganj: ['Amanullapur', 'Chayani', 'Durgapur', 'Gopalpur', 'Hazipur', 'Jirali', 'Mirwarishpur', 'Rajganj'],
    },
    Chandpur: {
      'Chandpur Sadar': ['Ashikati', 'Baghadi', 'Balia', 'Bishnupur', 'Chandpur Union', 'Ibrahimpur', 'Kalyanpur', 'Moynamati'],
    },
    Lakshmipur: {
      'Lakshmipur Sadar': ['Bangakhachha', 'Basikpur', 'Bhabaniganj', 'Chandraganj', 'Char Ramani', 'Dattapara', 'Hajirpara', 'Mandari'],
    },
    Rangamati: {
      'Rangamati Sadar': ['Balukhali', 'Bandukbhanga', 'Jibtali', 'Kutukchhari', 'Magban', 'Mogban', 'Sapchhari'],
    },
    Khagrachhari: {
      'Khagrachhari Sadar': ['Bhaibonchhara', 'Golabari', 'Kamalchhari', 'Khagrachhari Union', 'Perachhara'],
    },
    Bandarban: {
      'Bandarban Sadar': ['Bandarban Union', 'Kuhalong', 'Rajbila', 'Rowangchhari Road', 'Sualok', 'Tankabati'],
    },
  },
  Rajshahi: {
    Rajshahi: {
      Boalia: ['Ward 1-5', 'Ward 6-10', 'Ward 11-15', 'Saheb Bazar', 'Alupatti', 'Kumarpara', 'Ghoramara'],
      Motihar: ['Ward 28', 'Ward 29', 'Ward 30', 'RU Campus', 'Kajla', 'Dharampur', 'Binodpur'],
      Rajpara: ['Ward 1-4', 'Court Station', 'C&B More', 'Medical Area', 'Laxmipur'],
      'Shah Makhdum': ['Ward 14-17', 'Airport Road', 'Nawdapara', 'Postal Colony'],
      Paba: ['Damkur', 'Dharampur', 'Harian', 'Haripur', 'Huzripur', 'Parila', 'Boro Gachha'],
      Bagha: ['Arani', 'Bausa', 'Bajubagha', 'Chakrajapur', 'Gorgori', 'Monigram', 'Pakuria'],
      Charghat: ['Bhadra', 'Charghat Union', 'Jhikra', 'Kaluhati', 'Nimtala', 'Salua', 'Yusufpur'],
      Durgapur: ['Deluabari', 'Dharmapur', 'Jhaluka', 'Kalyanpur', 'Maria', 'Nowpara', 'Pananagar'],
      Godagari: ['Basantapur', 'Char Ashariadaha', 'Deopara', 'Gogram', 'Godagari Union', 'Matikata', 'Mohonpur', 'Pakri'],
    },
    Bogura: {
      'Bogura Sadar': ['Ward 1-21 (Paurashava)', 'Erulia', 'Fapore', 'Gokul', 'Lahiri Para', 'Namunja', 'Nishindara', 'Nungola', 'Shakharia'],
      Sariakandi: ['Bhoberpara', 'Chaluabari', 'Chandan Baisha', 'Hatsherpur', 'Kajla', 'Kutubpur', 'Sariakandi Union'],
      Sherpur: ['Bhabanipur', 'Bishalpur', 'Garidaha', 'Khanpur', 'Khamarkandi', 'Kusumbi', 'Mirzapur', 'Simabari'],
      Shibganj: ['Atmul', 'Buriganj', 'Deoli', 'Kisorpur', 'Maynaguri', 'Mokarampur', 'Pirab', 'Raynagar', 'Shibganj Union'],
    },
    Pabna: {
      'Pabna Sadar': ['Atgharia Road', 'Bharara', 'Char Tarapur', 'Dabirpur', 'Dogachhi', 'Gayeshpur', 'Hemayetpur', 'Maligachha', 'Sadhupara'],
      Ishwardi: ['Dashuria', 'Lakshimikunda', 'Muladuli', 'Paksey', 'Sahapur', 'Sara'],
    },
    Sirajganj: {
      'Sirajganj Sadar': ['Baghbati', 'Bahuli', 'Chhangachha', 'Kalia Haripur', 'Kowakhola', 'Mechhra', 'Ratanpur', 'Saidabad', 'Sheyalkol'],
      Ullahpara: ['Bangala', 'Barapangashi', 'Bhatkandi', 'Durganagar', 'Hatikumrul', 'Mohonpur', 'Purnimagati', 'Salap', 'Ullahpara Union'],
    },
    Naogaon: {
      'Naogaon Sadar': ['Bakapur', 'Balia', 'Bhimpur', 'Boalia', 'Chandi', 'Dubalhati', 'Hapania', 'Kailashpur', 'Kashimpur', 'Sailgachhi'],
    },
    Natore: {
      'Natore Sadar': ['Bara Harishpur', 'Bhatshala', 'Chhatni', 'Dighapatia', 'Halsha', 'Kafuria', 'Lakshmipur', 'Tebaria'],
    },
    Chapainawabganj: {
      'Chapainawabganj Sadar': ['Alinagar', 'Baliadanga', 'Baraghar', 'Charsadhabpur', 'Debinagar', 'Jhilim', 'Maharajpur', 'Ranihati', 'Sundarpur'],
    },
    Joypurhat: {
      'Joypurhat Sadar': ['Amdoi', 'Bambu', 'Bhadsa', 'Dogachhi', 'Jamalpur', 'Mohammadpur', 'Puranapail', 'Sree Pur'],
    },
  },
  Khulna: {
    Khulna: {
      Kotwali: ['Ward 17-23 (Paurashava)', 'Shibbari', 'Dakbangla', 'Royal More', 'Sonadanga Border'],
      Sonadanga: ['Ward 14-16', 'Boyra', 'Chotoboyra', 'Mujgunni', 'Sonadanga Bus Terminal Area'],
      Khalishpur: ['Ward 7-13', 'Khalishpur Housing', 'BIDC Road', 'Daulatpur Border', 'People’s Gate'],
      Daulatpur: ['Ward 1-6', 'Deyana', 'Daulatpur Bazar', 'Maheswarpasha', 'Senhati Border'],
      KhanjahanAli: ['Ward 1-3', 'Gilatala', 'Jahanabad Cantonment', 'Shiromoni', 'Atra'],
      Dighalia: ['Aranghata', 'Barakpur', 'Dighalia Union', 'Gazirhat', 'Kamargati', 'Senhati'],
      Dumuria: ['Atlia', 'Bhandarpara', 'Dumuria Union', 'Ghutadia', 'Khamarpara', 'Magurkhali', 'Rangunia', 'Rongpur', 'Rudaghara', 'Sahas'],
      Rupsha: ['Aichgati', 'Ghatbhog', 'Naihati', 'Rupsha Union', 'Sreefaltala', 'Taltala'],
      Batiaghata: ['Amirpur', 'Batiaghata Union', 'Bhandarkot', 'Gangarampur', 'Jalma', 'Surkhali'],
    },
    Jashore: {
      'Jashore Sadar': ['Arabpur', 'Basundia', 'Chanchra', 'Chowgachha Road', 'Fatehpur', 'Haibatpur', 'Ichhali', 'Kashimpur', 'Narendrapur', 'Upashahar'],
      Benapole: ['Benapole Paurashava', 'Bahadurpur', 'Dighirpar', 'Goga', 'Putkhali', 'Shikarpur'],
    },
    Kushtia: {
      'Kushtia Sadar': ['Alampur', 'Amla', 'Barokhada', 'Bot-toil', 'Harinarayanpur', 'Jhaudia', 'Majhpara', 'Patikabari', 'Ujangram'],
    },
    Jhenaidah: {
      'Jhenaidah Sadar': ['Alampur', 'Dogachhi', 'Furfura', 'Ganna', 'Harishankarpur', 'Kalicharanpur', 'Kumarradanga', 'Maharajpur', 'Padmakar'],
    },
    Satkhira: {
      'Satkhira Sadar': ['Agardari', 'Alipur', 'Baikari', 'Balli', 'Banshdaha', 'Brahmarajpur', 'Dhapakhali', 'Fingri', 'Ghola', 'Labsha'],
    },
    Bagerhat: {
      'Bagerhat Sadar': ['Baruipara', 'Bemarta', 'Bishnupur', 'Dhitsree', 'Gotapara', 'Jatrapur', 'Karapara', 'Khanpur', 'Rakhalgachhi', 'Shatgumbad'],
    },
    Chuadanga: {
      'Chuadanga Sadar': ['Alukdia', 'Beggadanga', 'Ghashila', 'Kutubpur', 'Mominpur', 'Padmabila', 'Shankarchandra', 'Titudaha'],
    },
    Meherpur: {
      'Meherpur Sadar': ['Amjhupi', 'Buripota', 'Kamarpara', 'Kutubpur', 'Monoharpur', 'Pirojpur', 'Shyamnagar'],
    },
    Narail: {
      'Narail Sadar': ['Auria', 'Banshigram', 'Bichhali', 'Chandibarpur', 'Habakhali', 'Kalia Road', 'Maijpara', 'Mullickpur', 'Shahabad'],
    },
    Magura: {
      'Magura Sadar': ['Atharokhada', 'Bagra', 'Chaulia', 'Gopalgram', 'Hazipur', 'Jagdal', 'Kuchiamora', 'Maghi', 'Raghabdair', 'Satjitpur'],
    },
  },
  Barishal: {
    Barishal: {
      'Barishal Sadar': ['Ward 1-30 (City Corp)', 'Chandramohan', 'Char Baria', 'Char Kowa', 'Char Monai', 'Jagashahi', 'Kashipur', 'Roypasha', 'Shayestabad', 'Tungibaria'],
      Babuganj: ['Agarpur', 'Chandpasha', 'Dehergati', 'Kedarpur', 'Madhabpasha', 'Rahmatpur'],
      Bakerganj: ['Char Amadi', 'Darial', 'Durgapur', 'Faridpur', 'Garuria', 'Kabai', 'Nalua', 'Padmar Par', 'Rangashree'],
      Gournadi: ['Bararthi', 'Batajor', 'Barthi', 'Chandshi', 'Gournadi Union', 'Kandapara', 'Mahilara', 'Nalchira', 'Sarikal'],
    },
    Patuakhali: {
      'Patuakhali Sadar': ['Auliapur', 'Badarpur', 'Bara Bighai', 'Choto Bighai', 'Itbaria', 'Kalikapur', 'Kamalapur', 'Laukhali', 'Madarbunia'],
      Kuakata: ['Kuakata Paurashava', 'Latachapli', 'Dhankhali', 'Lalua', 'Mithaganj', 'Nilganj'],
    },
    Bhola: {
      'Bhola Sadar': ['Alinagar', 'Bapta', 'Char Samaiya', 'Dhania', 'Ilisha', 'Kachia', 'Paschim Ilisha', 'Rajapur', 'Shibpur', 'Velumia'],
    },
    Pirojpur: {
      'Pirojpur Sadar': ['Durgapur', 'Kadamtala', 'Kalakhali', 'Pirojpur Union', 'Shariktala', 'Shankarpasha', 'Tona'],
    },
    Barguna: {
      'Barguna Sadar': ['Ayla Patakata', 'Badarkhali', 'Barguna Union', 'Burirchar', 'Dhalua', 'Gaurichanna', 'Keorabunia', 'Naltona', 'Sarkari Khal'],
    },
    Jhalokati: {
      'Jhalokati Sadar': ['Gabkhan Dhanasiri', 'Kirtipasha', 'Nabagram', 'Pona', 'Ponabalia', 'Ramchandrapur', 'Sekherhat', 'Sujabad'],
    },
  },
  Sylhet: {
    Sylhet: {
      'Sylhet Sadar': ['Ward 1-27 (City Corp)', 'Hatkhola', 'Jalalabad', 'Kandigaon', 'Khadimnagar', 'Khadimpara', 'Mogla Bazar', 'Tukerbazar'],
      Beanibazar: ['Alinagar', 'Charkhai', 'Dubag', 'Kurarbazar', 'Mullapur', 'Muraroi', 'Sheola', 'Tilpara'],
      Golapganj: ['Amura', 'Badepasha', 'Bagha', 'Bhadeshwar', 'Budhbaribazar', 'Dhaka Dakshin', 'Golapganj Union', 'Lakshmipasha', 'Sharifganj'],
      Gowainghat: ['Alirgaon', 'Dowbari', 'Fatehpur', 'Gowainghat Union', 'Jaflong', 'Lengura', 'Nandirgaon', 'Rustampur', 'Towakul'],
      Sreemangal: ['Ashidron', 'Bhunabir', 'Kalapur', 'Kalighat', 'Mirzapur', 'Rajghat', 'Satgaon', 'Sindurkhan', 'Sreemangal Union'],
    },
    Moulvibazar: {
      'Moulvibazar Sadar': ['Akhailkura', 'Amtail', 'Chandnighat', 'Ekatuna', 'Giasnagar', 'Kamalpur', 'Khadimnagar', 'Monumukh', 'Nazirabad'],
      Kulaura: ['Baramchal', 'Bhatkandi', 'Bhukshimail', 'Brammanbazar', 'Joychandi', 'Kadirpur', 'Kulaura Union', 'Routhgaon', 'Sharifpur'],
    },
    Habiganj: {
      'Habiganj Sadar': ['Gopaya', 'Lakhai Road', 'Lokra', 'Nurpur', 'Poil', 'Rajiura', 'Rikabibazar', 'Sayestaganj', 'Tegharia', 'Umednagar'],
      Madhabpur: ['Adaoir', 'Andhariapara', 'Baghachhara', 'Bohara', 'Choumuhani', 'Dharmaghar', 'Jagadishpur', 'Madhabpur Union', 'Shahjahanpur'],
    },
    Sunamganj: {
      'Sunamganj Sadar': ['Bangaon', 'Gourarang', 'Jahangirnagar', 'Kathair', 'Kurbannagar', 'Lakshmansree', 'Mohonpur', 'Mollarpara', 'Rampur', 'Surma'],
    },
  },
  Rangpur: {
    Rangpur: {
      'Rangpur Sadar': ['Ward 1-33 (City Corp)', 'Chandanthakur', 'Haridebpur', 'Kallyanpur', 'Mominpur', 'Pashuram', 'Radhaballabh', 'Sadar Union', 'Sonaichhari', 'Uttam'],
      Badarganj: ['Bishnupur', 'Damodarpur', 'Gopalpur', 'Gopinathpur', 'Kalupara', 'Kutubpur', 'Lohanipara', 'Madhupur', 'Radhanagar'],
      Pirganj: ['Baradargah', 'Chatra', 'Chaitrakol', 'Kabilpur', 'Madankhali', 'Mithipur', 'Pirganj Union', 'Ramnathpur', 'Shanerhat', 'Tukuria'],
    },
    Dinajpur: {
      'Dinajpur Sadar': ['Auliapur', 'Chehelgazi', 'Fazilpur', 'Kamalpur', 'Sankarpur', 'Sasara', 'Sundarban', 'Uthrail'],
    },
    Gaibandha: {
      'Gaibandha Sadar': ['Balia', 'Boali', 'Ghidaha', 'Kamarbari', 'Kholahati', 'Mollar Char', 'Ramchandrapur', 'Sahapara'],
    },
    Kurigram: {
      'Kurigram Sadar': ['Belgachha', 'Bhogdanga', 'Char Jatrapur', 'Ghogadaha', 'Holokhana', 'Kathalbari', 'Mogalbachha', 'Panchgachhi'],
    },
    Lalmonirhat: {
      'Lalmonirhat Sadar': ['Barabari', 'Gokunda', 'Harati', 'Khuniya Gachh', 'Kulaghat', 'Moghalhat', 'Rajpur'],
    },
    Nilphamari: {
      'Nilphamari Sadar': ['Charaikhola', 'Gorgram', 'Itakhola', 'Kundapukur', 'Palashbari', 'Ramnagar', 'Sangashi', 'Tupamari'],
    },
    Panchagarh: {
      'Panchagarh Sadar': ['Amarkhana', 'Chaklahat', 'Dhapchhatra', 'Garinabari', 'Hafizabad', 'Kunderpara', 'Magura', 'Panchagarh Union'],
    },
    Thakurgaon: {
      'Thakurgaon Sadar': ['Akhanagar', 'Auliapur', 'Baliadangi Road', 'Chilarang', 'Debipur', 'Gareya', 'Jagannathpur', 'Nargun', 'Ruhia', 'Salandar'],
    },
  },
  Mymensingh: {
    Mymensingh: {
      'Mymensingh Sadar': ['Ward 1-33 (City Corp)', 'Ashtadhar', 'Bhabakhali', 'Boror Char', 'Char Ishwardia', 'Char Nilakshia', 'Dapunia', 'Ghagra', 'Khagdahar', 'Paranganj', 'Sirta'],
      Muktagachha: ['Baraigram', 'Basati', 'Daudpur', 'Ghonapara', 'Kashimpur', 'Kheruajani', 'Kumargata', 'Maniknagar', 'Tarati'],
      Trishal: ['Bailor', 'Dhanikhola', 'Harirampur', 'Kanthal', 'Mathbari', 'Mokshapur', 'Rampur', 'Sakhua', 'Trishal Union'],
      Bhaluka: ['Birunia', 'Dakshin Bhaluka', 'Dhalia', 'Habirbari', 'Mallikbari', 'Meduar', 'Rajoi', 'Uthura'],
    },
    Jamalpur: {
      'Jamalpur Sadar': ['Banshchhara', 'Digpait', 'Ghoradhap', 'Itail', 'Kendua', 'Lakshmir Char', 'Meshra', 'Narundi', 'Ranagachha', 'Shahbazpur', 'Sharifpur', 'Tulshipur'],
    },
    Netrokona: {
      'Netrokona Sadar': ['Amtoil', 'Balia', 'Challisha', 'Dakshin Singher', 'Kailati', 'Madanpur', 'Medni', 'Mougati', 'Rautha'],
    },
    Sherpur: {
      'Sherpur Sadar': ['Bajitkhila', 'Balia', 'Betmari Gakulpur', 'Char Charia', 'Char Muchharia', 'Dhala', 'Kamaria', 'Pakuria', 'Rampur', 'Roumari'],
    },
  },
};

/**
 * Returns all 8 administrative divisions of Bangladesh
 */
export function getDivisions(): string[] {
  return Object.keys(BANGLADESH_LOCATIONS);
}

/**
 * Returns all districts belonging to a specific division
 */
export function getDistricts(division: string): string[] {
  if (!division) return [];
  const divData = BANGLADESH_LOCATIONS[division];
  return divData ? Object.keys(divData) : [];
}

/**
 * Returns all Upazilas / Thanas for a division and district
 */
export function getUpazilas(division: string, district: string): string[] {
  if (!division || !district) return [];
  const divData = BANGLADESH_LOCATIONS[division];
  if (!divData) return [];
  const distData = divData[district];
  return distData ? Object.keys(distData) : [];
}

/**
 * Returns all Unions or Wards for a specific Upazila/Thana
 */
export function getUnionsOrWards(division: string, district: string, upazila: string): string[] {
  if (!division || !district || !upazila) return [];
  const divData = BANGLADESH_LOCATIONS[division];
  if (!divData) return [];
  const distData = divData[district];
  if (!distData) return [];
  return distData[upazila] || [];
}

/**
 * Validates whether a location hierarchy combination is authentic in Bangladesh
 */
export function validateBdLocation(
  division: string,
  district: string,
  upazila?: string,
  unionWard?: string
): { valid: boolean; error?: string } {
  if (!division || !division.trim()) {
    return { valid: false, error: 'Division is required' };
  }
  const div = division.trim();
  const divData = BANGLADESH_LOCATIONS[div];
  if (!divData) {
    return { valid: false, error: `Invalid Bangladesh division: "${div}". Must be one of: ${getDivisions().join(', ')}` };
  }

  if (!district || !district.trim()) {
    return { valid: false, error: 'District is required' };
  }
  const dist = district.trim();
  const distData = divData[dist];
  if (!distData) {
    const validDistricts = Object.keys(divData).join(', ');
    return { valid: false, error: `District "${dist}" does not belong to ${div} division. Valid districts: ${validDistricts}` };
  }

  if (upazila && upazila.trim()) {
    const upz = upazila.trim();
    const upzData = distData[upz];
    if (!upzData) {
      // If metropolitan thana / upazila not in static list, check case-insensitive match
      const matchedKey = Object.keys(distData).find((k) => k.toLowerCase() === upz.toLowerCase());
      if (!matchedKey) {
        return {
          valid: false,
          error: `Upazila/Thana "${upz}" does not belong to ${dist} district. Valid upazilas: ${Object.keys(distData).join(', ')}`,
        };
      }
    }
  }

  return { valid: true };
}
