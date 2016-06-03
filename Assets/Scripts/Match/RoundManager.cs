using UnityEngine;
using UnityEngine.UI;
using System.Collections;
using System.Collections.Generic;


public class RoundManager : MonoBehaviour {

    public delegate void OnNewRoundEventHandler();
    public OnNewRoundEventHandler ResetPlayer;

    

    //int
    private int _amountOfRounds = 1;
    //int

    //List
    [SerializeField]
    private List<GameObject> _roundObjects;
    //List

    //Scripts
    [SerializeField]
    private PlayerScore _checkScore;

   
    //Text
    private Text _roundText;
    //Text

    //GameObject
    [SerializeField]
    private GameObject _winText;

    [SerializeField]
    private GameObject[] _buttonObjects;
    //GameObject

    //Scripts
    [SerializeField]
    private MatchStart _matchStart;
    private RoundsSetUp _roundSetUp;
    //Scripts

    [SerializeField]
    private AudioSource levelOST;

    [SerializeField]
    bool _endGame;

    bool runOnce;

    void Awake()
    {

        HealthPlayer.OnNewRound += StopMatch;
        HealthPlayer.OnNewRound += AddNewRound;
       
    }

	void Start () 
    {
        _winText.SetActive(false);

        _roundSetUp = this.GetComponent<RoundsSetUp>();

        foreach (GameObject roundobj in _roundObjects)
            _roundText = roundobj.GetComponent<Text>();

        foreach (GameObject button in _buttonObjects)
            button.SetActive(false);

        _roundText.text = "Round " + _amountOfRounds;

        _roundObjects[0].SetActive(false);   
	}

    void Update ()
    {
       // StopMatch();
    }

    
   

    void AddNewRound(HealthPlayer player)
    {
        if (!_endGame)
        StartCoroutine("AddRound");
    }

     IEnumerator AddRound()
    {
         if (!_endGame)
         {
             print("ADD ROUND");

             if (ResetPlayer != null)
                 ResetPlayer();

             _amountOfRounds++;

             foreach (GameObject roundobj in _roundObjects)
                 _roundText = roundobj.GetComponent<Text>();


             _roundObjects[1].SetActive(false);

                 _roundObjects[0].SetActive(true);

                 yield return new WaitForSeconds(3);

                 _roundObjects[0].SetActive(false);
                 _roundObjects[1].SetActive(true);

                 _matchStart.StartCoroutine("StartNewRound");
             _roundText.text = "Round " + _amountOfRounds;
         }
    }

     void StopMatch(HealthPlayer player)
     {
         if (_checkScore.P1Score >= _roundSetUp.BestOf || _checkScore.P2Score >= _roundSetUp.BestOf || _checkScore.P3Score >= _roundSetUp.BestOf || _checkScore.P4Score >= _roundSetUp.BestOf)
         {
             _endGame = true;
             StopGame();
         }

     }


    private void StopGame()
    {

        if (!runOnce)
        {
            levelOST.Stop();
            SoundManager.PlayAudioClip(AudioData.Win);

            foreach (GameObject button in _buttonObjects)
                button.SetActive(true);


            _winText.SetActive(true);

            if (_checkScore.P1Score > _checkScore.P2Score || _checkScore.P1Score > _checkScore.P3Score || _checkScore.P1Score > _checkScore.P4Score)
                _winText.GetComponent<Text>().text = "P1 WINS \n \n" + "KILLS: " + _checkScore.P1Score + "\n DEATHS: " + (_checkScore.P2Score + _checkScore.P3Score + _checkScore.P4Score);
            else if (_checkScore.P2Score > _checkScore.P1Score || _checkScore.P2Score > _checkScore.P3Score || _checkScore.P2Score > _checkScore.P4Score)
                _winText.GetComponent<Text>().text = "P2 WINS \n \n" + "KILLS: " + _checkScore.P2Score + "\n DEATHS: " + (_checkScore.P1Score + _checkScore.P3Score + _checkScore.P4Score);
            else if (_checkScore.P3Score > _checkScore.P1Score || _checkScore.P3Score > _checkScore.P2Score || _checkScore.P3Score > _checkScore.P4Score)
                _winText.GetComponent<Text>().text = "P3 WINS \n \n" + "KILLS: " + _checkScore.P3Score + "\n DEATHS: " + (_checkScore.P2Score + _checkScore.P1Score + _checkScore.P4Score);
            else if (_checkScore.P4Score > _checkScore.P1Score || _checkScore.P4Score > _checkScore.P2Score || _checkScore.P4Score > _checkScore.P3Score)
                _winText.GetComponent<Text>().text = "P4 WINS \n \n" + "KILLS: " + _checkScore.P4Score + "\n DEATHS: " + (_checkScore.P2Score + _checkScore.P3Score + _checkScore.P1Score);
            runOnce = true;
        }
    }
}
