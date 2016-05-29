using UnityEngine;
using System.Collections;
using System.IO;
using UnityEngine.UI;
using System.Runtime.Serialization.Formatters.Binary;

public class JoinManager : MonoBehaviour
{


    [SerializeField]
    private JoinButton _joinButton;

    //Int
    [SerializeField]
    private int players; // The amount of player in-game that will be storaged for use.
    private int one = 1; // This is the value we will be using to change the amount of players.
    //Int

    //Bool
    [SerializeField]
    private bool resetPlayers;
    //Bool

    void Awake()
    {

        if (resetPlayers)
        {
            players = 0;

            SaveResource();
        }
           

        LoadResource();

        if (_joinButton != null)
        _joinButton.OnPlayersJoined += SaveResource;

        
    }

    public int Players
    {
        get { return players; }
    }

    public int AddPlayer
    {
        get { return players; }
        set { players += one; }
    }

    public int RemovePlayer
    {
        get { return players; }
        set { players -= one; }
    }


    public void SaveResource()
    {
        BinaryFormatter bf = new BinaryFormatter();

        FileStream file = File.Create(Application.persistentDataPath + "/AmountOfPlayers.dat");

        SaveData saveData = new SaveData();
        saveData.players = players;
        bf.Serialize(file, saveData);

        file.Close();


        print("Player Saved! Amount of players: " + players);
    }

    public void LoadResource()
    {
        BinaryFormatter bf = new BinaryFormatter();

        if (File.Exists(Application.persistentDataPath + "/AmountOfPlayers.dat"))
        {
            FileStream file = File.Open(Application.persistentDataPath + "/AmountOfPlayers.dat", FileMode.Open);

            SaveData saveData = (SaveData)bf.Deserialize(file);

            players = saveData.players;

            file.Close();

            print("Players loaded! Amount of players: " + players);
        }

        else
            print("Players have not been saved. Please check your ...");
    }


    [System.Serializable]
    public class SaveData
    {
        public int players;
    }
}
