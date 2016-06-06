using UnityEngine;
using UnityEngine.UI;
using System.Collections;



public class RoundManager : MonoBehaviour {


    public delegate void EndRoundEventHandler();
    public EndRoundEventHandler OnGameEnd;

    public EndRoundEventHandler OnRoundEnd;
    public EndRoundEventHandler OnRoundStart;

    //Int
    private int _amountOfRounds = 1;

    public int GetRoundAmount
    {
        get { return _amountOfRounds; }
    }
    //Int

    //Scripts
    [SerializeField] private PlayerScore _checkScore;
     [SerializeField] private RoundsSetUp _roundSetUp;
    //Scripts

   bool _endGame;


    void Awake()
    {
        HealthPlayer.OnNewRound += AddNewRound;    
       _checkScore.OnPlayerScore += StopMatch;
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

             if (OnRoundStart != null)
                 OnRoundStart();

              yield return new WaitForSeconds(2);
             

             if (OnRoundEnd != null)
                 OnRoundEnd();
         }
    }



    private void StopGame()
    {
            SoundManager.PlayAudioClip(AudioData.Win);

            if (OnGameEnd != null)
                OnGameEnd();        
    }
}
