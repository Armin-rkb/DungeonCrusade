using UnityEngine;
using System.Collections;

public class BestOfManager : MonoBehaviour
{


    // NEEDS DELEGATE. FIXING!
    [SerializeField]
    private RoundsSetUp _roundsSetUp;
    // NEEDS DELEGATE. FIXING!

    //Bool
    private bool _runOnce;
    
    [SerializeField] bool _adjustRound;
    //Bool

    void Update()
    {
        if (_adjustRound)
            AdjustRound();
    }

    void AdjustRound()
    {
        if (Input.GetAxis(ControllerInputs.allhorizontal) < 0)
        {
            if (!_runOnce)
            {
                if (_roundsSetUp.Round > 1)
                {
                    _roundsSetUp.MinRound-= 1;
                    _runOnce = true;
                }
            }
        }

        else if (Input.GetAxis(ControllerInputs.allhorizontal) > 0)
        {
            if (!_runOnce)
            {
                _roundsSetUp.AddRound+= 1;
                _runOnce = true;
            }
        }

        else
        {
            _runOnce = false;
        }
    }
}
