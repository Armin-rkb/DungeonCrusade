using UnityEngine;
using System.Collections;
using System.IO;
using UnityEngine.UI;
using System.Runtime.Serialization.Formatters.Binary;

public class RoundsSetUp : MonoBehaviour
{

    //Int
    [SerializeField]
    private int bestof; // The round that the game will play in.
    private int one = 1; // This is the value we will be using to change the rounds.
    //Int

    //Text
    private Text _roundText;
    //Text

    //GameObject
    [SerializeField]
    private GameObject _roundObj;

    [SerializeField]
    private MainMenuButtons _mainMenuButtons;
    //GameObject

    void Awake()
    {
        if (_mainMenuButtons != null)
        _mainMenuButtons.OnPlayButton += SaveResource;
    }

    void Start()
    {
        LoadResource();
        
        if (_roundText != null)
        {
            _roundText = _roundObj.GetComponent<Text>();
            _roundText.text = "Best Of: " + BestOf;
        }
           
    }


    public int BestOf
    {
        get { return bestof; }
    }

    public int AddBestOf
    {
        get { return bestof; }
        set { bestof += one; }
    }

    public int MinBestOf
    {
        get { return bestof; }
        set { bestof -= one; }
    }

    void Update()
    {
        CheckRound();
    }

    void CheckRound()
    {
        if (_roundText != null)
        {
            _roundText = _roundObj.GetComponent<Text>();
            _roundText.text = "Best Of: " + BestOf;
        }
    }

    public void SaveResource()
    {
        BinaryFormatter bf = new BinaryFormatter();

        FileStream file = File.Create(Application.persistentDataPath + "/BestOfAmount.dat");

        SaveData saveData = new SaveData();
        saveData.bestof = bestof;
        bf.Serialize(file, saveData);

        file.Close();

        _roundText = _roundObj.GetComponent<Text>();
        _roundText.text = "Best Of: " + saveData.bestof;
    }

    public void LoadResource()
    {
        BinaryFormatter bf = new BinaryFormatter();

        if (File.Exists(Application.persistentDataPath + "/BestOfAmount.dat"))
        {
            FileStream file = File.Open(Application.persistentDataPath + "/BestOfAmount.dat", FileMode.Open);

            SaveData saveData = (SaveData)bf.Deserialize(file);

            bestof = saveData.bestof;

            file.Close();

            if (_roundObj != null)
            {
                _roundText = _roundObj.GetComponent<Text>();
                _roundText.text = "Best Of: " + saveData.bestof;
            }
            
        }

        else
            print("Eat your spaghetti every-day-a!");
    }


    [System.Serializable]
    public class SaveData
    {
        public int bestof;
    }
}
