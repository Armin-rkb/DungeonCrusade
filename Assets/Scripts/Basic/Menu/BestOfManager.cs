using UnityEngine;
using System.Collections;

public class BestOfManager : MonoBehaviour
{


    [SerializeField] private RoundsSetUp _roundsSetUp;
    [SerializeField] private JoinButton _joinButton;
    [SerializeField] private AudioSource _selectFX;

    //Bool
    private bool _runOnce;
    private bool _doneSelection;

    public bool GetDoneSelection
    {
        get { return _doneSelection; }
    }
    
    [SerializeField] bool _adjustRound;
    //Bool

    void Update()
    {
        if (_joinButton.GetPlayersJoined)
        {
            if (_adjustRound && !_doneSelection)
                AdjustRound();

            CheckDone();
        }
        
    }

    void AdjustRound()
    {
        if (Input.GetAxis(ControllerInputs.allhorizontal) < 0)
        {
            if (!_runOnce)
            {
                if (_roundsSetUp.BestOf > 1)
                {
                    _roundsSetUp.MinBestOf -= 1;
                    _selectFX.Play();
                    _runOnce = true;
                }
            }
        }

        else if (Input.GetAxis(ControllerInputs.allhorizontal) > 0)
        {
            if (!_runOnce)
            {
                _roundsSetUp.AddBestOf += 1;
                _selectFX.Play();
                _runOnce = true;
            }
        }

        else
        {
            _runOnce = false;
        }
    }

    void CheckDone()
    {
        if (Input.GetKeyDown(KeyCode.Space) || Input.GetAxis(ControllerInputs.allvertical) > 0)
        {
            if (!_doneSelection)
            {
                SoundManager.PlayAudioClip(AudioData.ScoreUp);
                _doneSelection = true;
            }
            
        }

        else if (Input.GetKeyDown(KeyCode.Escape) || Input.GetAxis(ControllerInputs.allvertical) < 0)
        {
            if (_doneSelection)
            {
                SoundManager.PlayAudioClip(AudioData.ScoreUp);
                _doneSelection = false;
            }
        }
        
    }
}
