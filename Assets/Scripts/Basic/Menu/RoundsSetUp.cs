using UnityEngine;
using System.Collections;
using System.IO;
using UnityEngine.UI;
using System.Runtime.Serialization.Formatters.Binary;

public class RoundsSetUp : MonoBehaviour
{

    //Int
    [SerializeField]
    private int round;
    private int minus = 1;
    //Int

    //Text
    private Text _roundText;
    //Text

    //GameObject
    [SerializeField]
    private GameObject _roundObj;
    //GameObject

    void Start()
    {
        LoadResource();
        
           _roundText = _roundObj.GetComponent<Text>();
           _roundText.text = "Rounds: " + Round;
    }


    public int Round
    {
        get { return round; }
    }

    public int AddRound
    {
        get { return round; }
        set { round += minus;  }
    }

    public int MinRound
    {
         get { return round; }
        set { round -= minus; }
    }

    void Update()
    {
        CheckRound();
    }

    void CheckRound()
    {
      //  if (Input.GetAxis(ControllerInputs.allhorizontal) != 0)
      //  {
            _roundText = _roundObj.GetComponent<Text>();
            _roundText.text = "Rounds: " + Round;

        
      //  }
    }

    public void SaveResource()
    {
        BinaryFormatter bf = new BinaryFormatter();

        FileStream file = File.Create(Application.persistentDataPath + "/AmountOfRounds.dat");

        SaveData saveData = new SaveData();
        saveData.round = round;
        bf.Serialize(file, saveData);

        file.Close();

        _roundText = _roundObj.GetComponent<Text>();
        _roundText.text = "Rounds: " + saveData.round;
    }

    public void LoadResource()
    {
        BinaryFormatter bf = new BinaryFormatter();

        if (File.Exists(Application.persistentDataPath + "/AmountOfRounds.dat"))
        {
            FileStream file = File.Open(Application.persistentDataPath + "/AmountOfRounds.dat", FileMode.Open);

            SaveData saveData = (SaveData)bf.Deserialize(file);

            round = saveData.round;

            file.Close();


            _roundText = _roundObj.GetComponent<Text>();
            _roundText.text = "Rounds: " + saveData.round;
        }

        else
            print("Eat your spaghetti every-day-a!");
    }


    [System.Serializable]
    public class SaveData
    {
        public int round;
    }
}
