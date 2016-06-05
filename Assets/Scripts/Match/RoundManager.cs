using UnityEngine;
using UnityEngine.UI;
using System.Collections;
using System.Collections.Generic;


public class RoundManager : MonoBehaviour {


    public delegate void EndRoundEventHandler();
    public EndRoundEventHandler OnRoundEnd;

    //Int
    private int _amountOfRounds = 1;
    //Int

    //List
    [SerializeField]
    private List<GameObject> _roundObjects;
    //List

    //Text
    private Text _roundText;
    //Text

    //GameObject
    [SerializeField] private GameObject[] _buttonObjects;
    //GameObject

    //Scripts
    [SerializeField] private PlayerScore _checkScore;
    [SerializeField] private MatchStart _matchStart;
    private RoundsSetUp _roundSetUp;
    //Scripts

    [SerializeField] private AudioSource levelOST;

    [SerializeField] bool _endGame;

    bool runOnce;

    void Awake()
    {
       _checkScore.OnPlayerScore += StopMatch;
        HealthPlayer.OnNewRound += AddNewRound;      
    }

	void Start () 
    {
       

        _roundSetUp = this.GetComponent<RoundsSetUp>();

        foreach (GameObject roundobj in _roundObjects)
            _roundText = roundobj.GetComponent<Text>();

        foreach (GameObject button in _buttonObjects)
            button.SetActive(false);

        _roundText.text = "Round " + _amountOfRounds;

        _roundObjects[0].SetActive(false);   
	}


    void StopMatch()
    {
        if (_checkScore.P1Score >= _roundSetUp.BestOf || _checkScore.P2Score >= _roundSetUp.BestOf || _checkScore.P3Score >= _roundSetUp.BestOf || _checkScore.P4Score >= _roundSetUp.BestOf)
        {
            _endGame = true;
            StopGame();
        }

    }


    void AddNewRound(HealthPlayer player)
    {
        if (!_endGame)
        StartCoroutine("AddRound");
    }

     IEnumerator AddRound()
    {

        yield return new WaitForSeconds(.1f);
         if (!_endGame)
         {

     

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



    private void StopGame()
    {
        if (!runOnce)
        {
            levelOST.Stop();
            SoundManager.PlayAudioClip(AudioData.Win);

            foreach (GameObject button in _buttonObjects)
                button.SetActive(true);
            runOnce = true;

            if (OnRoundEnd != null)
                OnRoundEnd();
        }
    }
}
